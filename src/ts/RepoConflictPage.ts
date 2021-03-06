import {Context} from './Context';
import {ControlTag} from './ControlTag';
import {EBW} from './EBW';
import {File} from './conflict/File';
import {FileList} from './conflict/FileList';
import {FileListDisplayEvent, FileListDisplay} from './conflict/FileListDisplay';
import {MergeEditor} from './conflict/MergeEditor';
import {MergeInstructions} from './conflict/MergeInstructions';
import {CommitMessageDialogResult, CommitMessageDialog} from './CommitMessageDialog';
import {ClosePRDialog, ClosePRDialogResult} from './conflict/ClosePRDialog';
import {MergingInfo} from './conflict/MergingInfo';

// RepoConflictPage handles conflict-merging for the repo.
// It's main data is generated in public/repo_conflict.html
export class RepoConflictPage {
	protected editor: MergeEditor;
	protected commitDialog: CommitMessageDialog;
	protected closePRDialog: ClosePRDialog;
	protected mergingInfo: MergingInfo;

	constructor(protected context:Context) {
		let fileList = new FileList(context);
		let fileListDisplay = new FileListDisplay(context, document.getElementById(`staged-files-list`), fileList);

		fileListDisplay.el.addEventListener(`file-click`, (evt:CustomEvent)=> {
			this.fileListEvent(undefined, evt.detail.file);
		});

		this.editor = new MergeEditor(context, document.getElementById(`editor-work`));
		this.commitDialog = new CommitMessageDialog(false);
		new MergeInstructions(document.getElementById('merge-instructions'), this.editor);

		this.mergingInfo = new MergingInfo(document.getElementById(`merging-info`));
		this.closePRDialog = new ClosePRDialog(false);

		new ControlTag(document.getElementById(`files-show-tag`),
			(showing:boolean)=>{
				let el = document.getElementById(`files`);
				if (showing)
					el.classList.add(`showing`);
				else
					el.classList.remove(`showing`);				
				// el
				// .style.width = showing ? "30em":"0px";
			});


		let filesEl = document.getElementById('staged-files-data');
		if (!filesEl) {
			EBW.Error(`FAILED TO FIND #staged-files-data: cannot instantiate RepoConflictPage`);
			return;
		}
		let listjs = filesEl.innerText;
		fileList.load(JSON.parse(listjs));

		document.getElementById(`action-commit`).addEventListener(`click`, (evt)=>{
			evt.preventDefault(); evt.stopPropagation();
			this.commitDialog.Open(`Resolve Conflict`, `The merge will be resolved.`)
			.then(
				(r:CommitMessageDialogResult) => {
					if (r.Cancelled) {
						return;
					}
					console.log(`Result= `, r);
					this.context.RepoRedirect(`conflict/resolve`, 
						new Map([[`message`,r.Message],[`notes`,r.Notes]])
					);
					return;
				})
			.catch (EBW.Error);
		});
		document.getElementById(`action-abort`).addEventListener(`click`, (evt)=>{
			evt.preventDefault(); evt.stopPropagation();
			if (this.mergingInfo.IsPRMerge()) {
				this.closePRDialog.Open(`Close PR`,
					`You have been merging PR ${this.mergingInfo.PRNumber}.
					Do you want to close the PR?`, 
					{Close: false, CloseMessage:"", Cancelled: false})
				.then(
					(r:ClosePRDialogResult)=>{
						if (r.Cancelled) {
							return;
						}
						this.context.RepoRedirect(`conflict/abort`, 
							new Map([[`message`,r.CloseMessage],
								[`close`,r.Close]])
						);
						return;
					})
				.catch( EBW.Error );
			} else {				
				this.context.RepoRedirect(`conflict/abort`);
			}
		})
	}
	fileListEvent(e:FileListDisplayEvent, f:File) : void {
		console.log(`FileListEvent in RepoConflictPage: `, f);
		this.editor.Merge(f);
	}
}