import {CoordPicker} from './coordpicker.js';
import * as Places from './places.js';
import {IsoButton} from './isobutton.js';

export class PointPicker {
    constructor({coord, isodirection, isodifficulty, isodistance, addbutton, places, svg, pasteInput}) {
        this.coordpicker = new CoordPicker(coord);
        this.isodirection = new IsoButton(isodirection);
        this.isodifficulty = new IsoButton(isodifficulty);
        this.isodistance = new IsoButton(isodistance);
        this.addbutton = document.getElementById(addbutton);
        Places.createDropdownItems(places, 'dropdown-item');
        this.coordpicker.init(this.checkAddButtonCondition.bind(this), svg);
        this.isodirection.init(this.checkAddButtonCondition.bind(this));
        this.isodifficulty.init(this.checkAddButtonCondition.bind(this));
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

          const difficulties = [
            'unknown',
            'trivial',
            'easy',
            'medium',
            'hard',
            'challenging'
        ];

        let detectedDifficulty = null;
        for (const diff of difficulties) {
            const regex = new RegExp(`\\b${diff}\\b`, 'i');
            if (regex.test(text)) {
            detectedDifficulty = diff;
            break;
            }
        }
        if(!detectedDifficulty) return;

        this.isodirection.click(detectedDirection);
        this.isodifficulty.click(detectedDifficulty);
        this.isodistance.click(distance);
    }

    getValue() {
        let result = this.coordpicker.getValue();
        if(result == null) {
            alert("Invalid coordinates!");
            return null;
        }
        result.direction = this.isodirection.getValue();
        result.difficulty = this.isodifficulty.getValue();
        result.distance = this.isodistance.getValue();
        return result;
    }

    resetChoosen() {
        this.coordpicker.resetChoosen();
        this.isodirection.resetChoosen();
        this.isodifficulty.resetChoosen();
        this.isodistance.resetChoosen();
        this.checkAddButtonCondition();
        this.pasteInput.value = "";
    }

    GetRightClickHandler() {
        return this.coordpicker.rightClickHandler.bind(this.coordpicker);
    }

    checkAddButtonCondition()
    {
        if(this.isodistance.isSet() && this.isodifficulty.isSet() && this.coordpicker.isSet() && this.isodirection.isSet())
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