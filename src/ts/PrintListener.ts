import {EBW} from './EBW';

export class PrintListener {
	constructor(protected repoOwner:string, 
		protected repoName:string, 
		protected book:string=`book`) {
		if (``==this.book) {
			this.book = `book`;
		}
		EBW.API().PrintPdfEndpoint(repoOwner, repoName, book).then(
			([url])=>{
				this.startListener(url);
			})
		.catch( EBW.Error );
	}
	startListener(key:string) {
		let url = document.location.protocol +
				 "//" +
				 document.location.host + "/print/sse/" + key;
		let sse = new EventSource(url);
		sse.addEventListener(`open`, function() {
		});
		sse.addEventListener('tick', function(e) {
			console.log(`tick received: `, e);
		});
		sse.addEventListener(`info`, function(e) {
			// console.log(`INFO on printListener: `, e.data);
			let data = JSON.parse(e.data);
			EBW.Toast(`Printing: `, e.data);
		});
		sse.addEventListener(`error`, function(e) {
			let err = JSON.parse(e.data);
			EBW.Error(err);
			sse.close();
		});
		sse.addEventListener(`output`, e=> {
			let data = JSON.parse(e.data);
			let url = document.location.protocol +
				 "//" +
				 document.location.host + 
				 `/www/${this.repoOwner}/${this.repoName}/${data}`;
			EBW.Toast(`Your PDF is ready: opening in a new window.`);
			window.open(url, `${this.repoOwner}-${this.repoName}-pdf`);
		});
		sse.addEventListener(`done`, function(e) {
			sse.close();
		});
		sse.onmessage = (e)=>{
			this.onmessage(e);
		}
		sse.onerror = EBW.Error;

	}
	onmessage(e) {
		console.log(`PrintListener.onmessage: `, e);
	}
}