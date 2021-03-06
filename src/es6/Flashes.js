// Flashes is meant to implement a class that
// removes the containing #flashes div when the last flash
// is removed. But we haven't actually implemented this,
// because the div just becomes 0 height and 'disappears'.
class Flashes {
	constructor(el) {
		let fs = el.querySelectorAll(`.flash`);
		for (let i=0; i<fs.length; i++) {
			let f = fs.item(i);
			console.log(`Found flash: `, f);
		}
	}
}

// document.addEventListener(`DOMContentLoaded`, function() {
// 	let el = document.getElementById(`flashes`);
// 	if (el) {
// 		new Flashes(el);
// 	}
// });