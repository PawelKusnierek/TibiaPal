import * as places from "./places.js";

export class CoordPicker {
    #point;
    #callback;
    #value;
    constructor() {
        // No DOM input needed - coordinates stored internally
    }
    
    init(callback) {
        this.#callback = callback;
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
        this.#value = "";
        this.#point = null;
        this.internalcallback();
    }

    isSet(){
        return !!(this.#value && this.#value.trim() !== "");
    }

    setValue(val){
        this.#value = val;
        this.internalcallback();
    }

    getRawValue(){
        return this.#value || "";
    }

    getValue() {
        let result = {};
        let raw = this.getRawValue();
        if (raw == "") return null; 
        result.name = null;
        result.point = places.getValues(raw);
        if(result.point == null) return null;
        return result;
    }
}