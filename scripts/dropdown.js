
export class Dropdown {

  constructor(containerid) {
    this.id = containerid;
  }  

init(callback){  
  this.dropdownInput = document.querySelector('#'+this.id+' .dropdown-input');
  const dropdownList = document.querySelector('#'+this.id+' .dropdown-list');
  const dropdownItems = document.querySelectorAll('#'+this.id+' .dropdown-item');
  this.callback = callback;
  // Toggle dropdown when input is clicked
  this.dropdownInput.addEventListener('click', () => {
    dropdownList.classList.toggle('show');
    this.dropdownInput.removeAttribute('readonly'); // allows typing when open
  });

  // Filter items when typing
  this.dropdownInput.addEventListener('input', () => {
    const filter = this.dropdownInput.value.toLowerCase();
    dropdownItems.forEach(item => {
      const text = item.textContent.toLowerCase();
      item.style.display = text.includes(filter) ? '' : 'none';
    });
  });


  dropdownItems.forEach(item => {
    item.addEventListener('click', () => {
      this.dropdownInput.value = item.textContent;
      dropdownList.classList.remove('show');
      this.dropdownInput.setAttribute('readonly', true); // lock input after selection
      if(callback)callback();
    });
  });

  // Close dropdown if clicked outside
  window.addEventListener('click', (event) => {
    if (!event.target.closest('.dropdown-container')) {
      dropdownList.classList.remove('show');
      this.dropdownInput.setAttribute('readonly', true); // lock input when closed
    }
  });
}

resetChoosen(){
  this.dropdownInput.value="";
}

getRawValue(){
  return this.dropdownInput.value;
}

isSet(){
  if(this.dropdownInput.value != "")return true;
  return false;
}

setValue(val){
  this.dropdownInput.value = val;
  if(this.callback)this.callback();
}

}