export class IsoButton {

constructor(containerid) {
    this.id = containerid;
 }  


init(callback){

	const buttons = document.querySelectorAll('#'+this.id+' button');

	buttons.forEach(button => {
	button.addEventListener('click', () => {
	  buttons.forEach(btn => btn.classList.remove('active'));
	  button.classList.add('active');
	  if(callback)callback();
	});
	});
			  
}

click(value){
	const container = document.getElementById(this.id);
	if (!container) return;

    const button = container.querySelector(`button[data-value="${value}"]`);
	if (button) {
      button.click();
    }
}

resetChoosen(){
	const buttons = document.querySelectorAll('#'+this.id+' button');
	buttons.forEach(button => {button.classList.remove('active')});
}

isSet(){
	const buttons = document.querySelectorAll('#'+this.id+' button.active');
	if(buttons.length == 1) return true;
	return false;
}

getValue(){
	const button = document.querySelector(`#${this.id} button.active`);
    return button?.dataset.value;
}

}