document.addEventListener('DOMContentLoaded', () => {
const hunter = new FiendishHunter({
			map: 'tibia-map',
			isodirection: 'fiend-hunter-isostat-direction',
			isodistance: 'fiend-hunter-isostat-distance',
			addbutton: 'fiend-hunter-button-add',
			deletebutton: 'fiend-hunter-button-delete',
			exivaInput: 'fiend-hunter-input-spell'
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
	
	constructor({map, isodirection, isodistance, addbutton, deletebutton, exivaInput}){
		this.#map = new TibiaMap(map);
		this.#map.init();
		this.#pointpicker = new PointPicker(
			{	isodirection:isodirection, 
				isodistance:isodistance, 
				addbutton:addbutton, 
				svg:this.#map.getSvgContainer(),
				pasteInput:exivaInput});
		this.pointsmanager = new Manager(this.#map.getSvgContainer());

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

		// Fullscreen functionality
		const fullscreenButton = document.getElementById('fiend-hunter-button-fullscreen');
		if (fullscreenButton) {
			let isFullscreen = false;
			const elementsToHide = ['header', 'banner', 'right-header', 'left-sidebar', 'right-sidebar', 'tibiatrade_low_res', 'fiend-hunter-how-to-use', 'footer', 'left-footer-space', 'right-footer-space'];
			const navToggle = document.querySelector('.nav-toggle');
			const mainContent = document.getElementById('main-content');
			const pageContainer = document.getElementById('page-container');
			let originalMainContentStyle = null;
			let originalPageContainerStyle = null;

			fullscreenButton.addEventListener('click', () => {
				if (!isFullscreen) {
					// Store original styles
					if (mainContent) {
						originalMainContentStyle = {
							flexBasis: mainContent.style.flexBasis || getComputedStyle(mainContent).flexBasis,
							marginLeft: mainContent.style.marginLeft || getComputedStyle(mainContent).marginLeft,
							marginRight: mainContent.style.marginRight || getComputedStyle(mainContent).marginRight,
							width: mainContent.style.width || getComputedStyle(mainContent).width
						};
						// Apply fullscreen styles
						mainContent.style.flexBasis = '100%';
						mainContent.style.width = '100%';
						mainContent.style.marginLeft = '0';
						mainContent.style.marginRight = '0';
					}

					if (pageContainer) {
						originalPageContainerStyle = {
							display: pageContainer.style.display || getComputedStyle(pageContainer).display
						};
						pageContainer.style.display = 'block';
					}

					// Hide other elements
					elementsToHide.forEach(id => {
						const element = document.getElementById(id);
						if (element) {
							element.style.display = 'none';
						}
					});

					if (navToggle) {
						navToggle.style.display = 'none';
					}

					isFullscreen = true;
					fullscreenButton.classList.add('active');
				} else {
					// Restore original styles
					if (mainContent && originalMainContentStyle) {
						mainContent.style.flexBasis = originalMainContentStyle.flexBasis;
						mainContent.style.marginLeft = originalMainContentStyle.marginLeft;
						mainContent.style.marginRight = originalMainContentStyle.marginRight;
						mainContent.style.width = originalMainContentStyle.width;
					}

					if (pageContainer && originalPageContainerStyle) {
						pageContainer.style.display = originalPageContainerStyle.display;
					}

					// Show other elements
					elementsToHide.forEach(id => {
						const element = document.getElementById(id);
						if (element) {
							element.style.display = '';
						}
					});

					if (navToggle) {
						navToggle.style.display = '';
					}

					isFullscreen = false;
					fullscreenButton.classList.remove('active');
				}
			});
		}
	}

	get map(){
		return this.#map;
	}

}

class Manager{
	#childs = new Map(); 
	#polygons = new Map();
	#svg;
	constructor(svg){
		this.#svg = svg;
	}

	addPoint(value){
		let newData = new HunterDataContainer(new ExivaPolygon(value.distance, value.direction, places.fromTibiaCoord(value.point)), this.#svg);
		newData.score = 1;
		this.#childs.set(newData.id, new Set());
		let intersections = [];
		for (const [key,point] of this.#polygons) {
			let intersection = new PolygonIntersector(point.poly, newData.poly).doMagic();
			if(intersection != null){
				let newIntersecion = new HunterDataContainer(intersection, this.#svg);
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
	poly;
	constructor(polygon, svg){
		this.#id = HunterDataContainer.counter++;
		this.poly = polygon;
		this.#svgpolygon = new SVGPolygon(svg);
		this.#svgpolygon.draw(this.poly.points);
		this.#setBaseLook();
	}
	set id(value){}	
	get id (){
		return this.#id;
	}

	static clearCounter(){
		HunterDataContainer.counter = 0;
	}

	destroy(){
		this.#svgpolygon.destroy();
	}

	#setBaseLook(){
		this.#svgpolygon.setStrokeColor('black');
		this.#svgpolygon.setFillColor("#E0B32D"); // Default color
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

