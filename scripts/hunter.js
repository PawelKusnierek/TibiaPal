document.addEventListener('DOMContentLoaded', () => {
const hunter = new FiendishHunter({
			map: 'tibia-map',
			pointspane: 'fiendish-hunter-point-table',
			places: 'fiendish-hunter-dropdown-places',
			input: 'fiendish-hunter-dropdown-container',
			isodirection: 'fiendish-hunter-isostat-direction',
			isodistance: 'fiendish-hunter-isostat-distance',
			isodifficulty: 'fiendish-hunter-isostat-difficulty',
			addbutton: 'fiendish-hunter-button-add',
			deletebutton: 'fiendish-hunter-button-delete',
			exivaInput: 'fiendish-hunter-input-spell'
		});	
	});

import { Map as TibiaMap } from "./map.js";
import { PointPicker } from "./pointpicker.js";
import { PolygonIntersector, ExivaPolygon } from "./polygons.js"; 
import { SVGPolygon } from "./draw.js";
import * as places from "./places.js"

export class FiendishHunter {
	#map;
	#pointpicker;
	
	constructor({map, pointspane, places, input, isodirection, isodifficulty, isodistance, addbutton, deletebutton, exivaInput}){
		this.#map = new TibiaMap(map);
		this.#map.init();
		this.#pointpicker = new PointPicker(
			{	coord: input, 
				isodirection:isodirection, 
				isodifficulty:isodifficulty, 
				isodistance:isodistance, 
				addbutton:addbutton, 
				places:places, 
				svg:this.#map.getSvgContainer(),
				pasteInput:exivaInput});
		this.pointsmanager = new Manager(pointspane, this.#map.getSvgContainer());

		this.#map.registerCallback(this.#pointpicker.GetRightClickHandler());

		document.getElementById(addbutton).addEventListener('click', () => {
			let value = this.#pointpicker.getValue();
			this.#pointpicker.resetChoosen();
			this.#map.hideCross();
			if(value == null) {
				return;
			}
			this.pointsmanager.addPoint(value);
		});

		document.getElementById(deletebutton).addEventListener('click', () => {
			this.pointsmanager.deleteAll();
		});
	}

	get map(){
		return this.#map;
	}

}

class Manager{
	#childs = new Map(); 
	#polygons = new Map();
	#pointsTable;
	#svg;
	constructor(pointtable, svg){
		this.#pointsTable = pointtable;
		this.#svg = svg;
	}

	addPoint(value){
		let newData = new HunterDataContainer(new ExivaPolygon(value.distance, value.direction, places.fromTibiaCoord(value.point)), value.difficulty, this.#svg);
		newData.score = 1;
		this.#childs.set(newData.id, new Set());
		let intersections = [];
		for (const [key,point] of this.#polygons) {
			if(newData.difficulty != point.difficulty) {
				continue;
			}
			let intersection = new PolygonIntersector(point.poly, newData.poly).doMagic();
			if(intersection != null){
				let newIntersecion = new HunterDataContainer(intersection, point.difficulty, this.#svg);
				newIntersecion.score = this.getScore(point, newData);
				this.#childs.set(newIntersecion.id, new Set());
				this.#childs.get(newIntersecion.id).add(point.id);
				this.#childs.get(newIntersecion.id).add(newData.id);
				intersections.push(newIntersecion);
			}
		}

		this.#polygons.set(newData.id, newData);
		if(intersections.length == 0){

		}
		else{
			intersections.forEach(element => this.#polygons.set(element.id, element));
		}
		this.#updateDisplay();
		this.addRow(value, newData);
	}

	#updateDisplay(){
		const maxScore = this.#getMaxScore();
		this.#polygons.forEach((value, key) => 
		{
			value.updateLooksBasedOnMaxScore(maxScore);
		});
	}

	#getMaxScore(){
		let maxScore = 0;
		for (const [key, point] of this.#polygons) {
			if(point.score > maxScore){
				maxScore = point.score;
			}
		}
		return maxScore;
	}

	addRow(data, object){ 
		const tableBody = document.querySelector(`#${this.#pointsTable} tbody`);
		const rowNumber = tableBody.rows.length + 1;

		const row = document.createElement("tr");
		let name = "";
		if(data.name != null) name = data.name;
		// create cells
		row.innerHTML = `
		<td>${rowNumber}</td>
		<td>(${data.point.x},${data.point.y})</td>
		<td>${name}</td>
		<td>${data.distance}</td>
		<td>${data.direction}</td>
		<td><span style="color:${object.getColor()}">${data.difficulty}</span></td>
		<td style="text-align:center; cursor:pointer;">🗑️</td>
		`;

		// attach delete handler
		const deleteCell = row.lastElementChild;
		deleteCell.addEventListener("click", () => {
			this.removePoint(object.id);
			row.remove();
			this.renumberRows();
		});

		tableBody.appendChild(row);
  	}

	renumberRows() {
    const rows = document.querySelectorAll(`#${this.#pointsTable} tbody tr`);
    rows.forEach((row, index) => {
      row.cells[0].textContent = index + 1;
    });
  }

	removePoint(id){
		const childsSet = this.#childs.get(id);

		if (childsSet && childsSet.size != 0) {
			childsSet.forEach(child => {
				this.removePoint(child);
			});
		}
		this.#polygons.get(id).destroy();
		this.#polygons.delete(id);
		this.#updateDisplay();
	}

	deleteAll(){
		HunterDataContainer.clearCounter();
		this.#polygons.forEach((value, key) => 
		{
			value.destroy();
		});
		this.#polygons = new Map();
		this.#childs = new Map();
		const tableBody = document.querySelector(`#${this.#pointsTable} tbody`);
		tableBody.innerHTML = '';
	}

	getScore(HunterDataContainer1, HunterDataContainer2){
		//if((HunterDataContainer2.poly instanceof ExivaPolygon && HunterDataContainer2.poly.distance == 'Very Far') || 
		//(HunterDataContainer1.poly instanceof ExivaPolygon && HunterDataContainer1.poly.distance == 'Very Far')){
		//	return this.getDistanceScore(HunterDataContainer1.poly, HunterDataContainer2.poly);
		//}
		return Math.max(HunterDataContainer1.score,HunterDataContainer2.score) + 1;
	}

	getDistanceScore(poly1, poly2){
		let p1 = poly1.getAvgPont();
		let p2 = poly2.getAvgPont();
		let dist = Math.max(Math.abs(p1.x - p2.x), Math.abs(p1.y - p2.y)) - 450;
		if(dist < 0){
			return Math.max(poly1.score,poly2.score) + 1;
		}
		const A = 1;       // Starting value
		const B = 0.1;    // Asymptotic value as x → ∞
		const x0 = 300;    // Transition center point
		const k = 0.01;    // Steepness of the transition
	  
		const raw = A - (A - B) / (1 + Math.exp(-k * (dist - x0)));
  		return (Math.round(raw * 10) / 10) + Math.max(poly1.score,poly2.score) ;
	}
}

class HunterDataContainer {
	static counter = 0;
	#id;
	#svgpolygon;
	score = 0;
	difficulty = "unknown";
	poly;
	constructor(polygon, difficulty, svg){
		this.#id = HunterDataContainer.counter++;
		this.poly = polygon;
		this.difficulty = difficulty;
		this.#svgpolygon = new SVGPolygon(svg);
		this.#svgpolygon.draw(this.poly.points);
		this.#setBaseLook();
	}
	set id(value){}	
	get id (){
		return this.#id;
	}

	getColor()
	{
		switch(this.difficulty){
			case "unknown":
				return "#1b1b1b";
			case "trivial":
				return "#edf1ec";
			case "easy":
				return "#a1ff09";
			case "medium":
				return "#E0B32D";
			case "hard":
				return "#b6570a";
			case "challenging":
				return "#8b1021";
		}
	}

	static clearCounter(){
		HunterDataContainer.counter = 0;
	}

	destroy(){
		this.#svgpolygon.destroy();
	}

	#setBaseLook(){
		this.#svgpolygon.setStrokeColor('black');
		this.#svgpolygon.setFillColor(this.getColor());
	}

	updateLooksBasedOnMaxScore(maxScore)
	{
		if(this.score > maxScore - 1){
			this.#setResultLook();
		}
		else{
			this.#setBackgroundLook();
		}
	}

	#setResultLook(){
		this.#svgpolygon.setOpacity(80);
		this.#svgpolygon.setFillOpacity(60);
    }
	
	#setBackgroundLook(){
		this.#svgpolygon.setOpacity(30);
		this.#svgpolygon.setFillOpacity(30);
	}
}

