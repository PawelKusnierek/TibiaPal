import {CoordPicker} from './coordpicker.js';
import {IsoButton} from './isobutton.js';

export class PointPicker {
    constructor({isodirection, isodistance, addbutton, svg, pasteInput}) {
        this.coordpicker = new CoordPicker();
        this.isodirection = new IsoButton(isodirection);
        this.isodistance = new IsoButton(isodistance);
        this.addbutton = document.getElementById(addbutton);
        this.coordpicker.init(this.checkAddButtonCondition.bind(this));
        this.isodirection.init(this.checkAddButtonCondition.bind(this));
        this.isodistance.init(this.checkAddButtonCondition.bind(this));
        this.pasteInput = document.getElementById(pasteInput);
        this.pasteInput.addEventListener('input', () => {
            const text = this.pasteInput.value.toLowerCase();
            this.parseTextInput(text);
        });
    }

    parseTextInput(text)
    {
          const directions = [
            'north-east',
            'north-west',
            'south-east',
            'south-west',
            'north',
            'south',
            'east',
            'west'
        ];

        let detectedDirection = null;

        for (const dir of directions) {
            const regex = new RegExp(`\\b${dir}\\b`);
            if (regex.test(text)) {
            detectedDirection = dir;
            break;
            }
        }
        if(!detectedDirection) return;

        let distance = 'near';
        if (/\bvery\s+far\b/.test(text)) {
            distance = 'veryfar';
        } else if (/\bfar\b/.test(text)) {
            distance = 'far';
        }

        this.isodirection.click(detectedDirection);
        this.isodistance.click(distance);
    }

    getValue() {
        let result = this.coordpicker.getValue();
        if(result == null) {
            alert("Invalid coordinates!");
            return null;
        }
        result.direction = this.isodirection.getValue();
        result.distance = this.isodistance.getValue();
        return result;
    }

    resetChoosen() {
        this.coordpicker.resetChoosen();
        this.isodirection.resetChoosen();
        this.isodistance.resetChoosen();
        this.checkAddButtonCondition();
        this.pasteInput.value = "";
    }

    GetRightClickHandler() {
        return this.coordpicker.rightClickHandler.bind(this.coordpicker);
    }

    checkAddButtonCondition()
    {
        if(this.isodistance.isSet() && this.coordpicker.isSet() && this.isodirection.isSet())
        {
            this.addbutton.classList.add('active');
            this.addbutton.disabled=false;
        }
        else if(this.addbutton.disabled == false)
        {
            this.addbutton.disabled = true;
            this.addbutton.classList.remove('active');
        }
    }
}