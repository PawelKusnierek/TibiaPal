import { Dropdown } from "./dropdown.js";
import * as places from "./places.js";

export class CoordPicker extends Dropdown {
    #point;
    #callback;
    constructor(containerid) {
        super(containerid);
    }
    
    init(callback) {
        this.#callback = callback
        super.init(this.internalcallback.bind(this));
        this.resetChoosen();
    }
    
    rightClickHandler(point){
		point.round();
		if(this.#point != null && this.#point.compare(point))
        {
			this.resetChoosen();
            this.#point = null;
		}
		else{
			let tp = places.toTibiaCoord(point);
			this.setValue("("+tp.x+", "+tp.y+")");
            this.#point = point;
		}
		
	}

    internalcallback() {
        if (this.#callback) this.#callback();
    }

    resetChoosen(){
        super.resetChoosen();
    }

    getValue() {
        let result = {};
        let raw = super.getRawValue();
        if (raw == "") return null; 
        let coord = places.getValuesFromKey(raw)
        if(coord != null){result.name = raw; result.point = coord;}
        else { 
            result.name = null;
            result.point = places.getValues(raw);
        }
        if(result.point == null) return null;
        return result;
    }
}