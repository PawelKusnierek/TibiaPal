import { Point } from "./common.js";
const places = {
	'Thais Ship': {x: 32310, y:32211},
	'Venore Ship': {x: 32955, y: 32022},
	'Svargrond Ship': {x: 32342, y: 31109},
	'Yalahar Ship' : {x:32818, y:31273},
	'Carlin Ship' : {x:32388, y:31822},
	'Ab\'dendriel Ship' : {x:32735, y:31670},
	'Meriana Ship' : {x:32346, y:32622},
	'Liberty Bay Ship' : {x:32286, y:32891},
	'Port Hope Ship' : {x:32531, y:32785},
	'Ankrahmun Ship' : {x:33093, y:32884},
	'Darashia Ship' : {x:33290, y:32482},
	'Oramond Ship' : {x:33483, y:31986},
	'Cormaya Ship' : {x:33289, y:31957},
	'Edron Ship' : {x:33176, y:31765},
	'Krailos Ship' : {x:33492, y:31713},
	'Vengoth Boat' : {x:32857, y:31550},
	'Kazordoon Carpet' : {x:32590, y:31943},
	'Darashia Carpet' : {x:33269, y:32442},
	'Fermor Hills Carpet' : {x:32535, y:31838},
	'Zao Carpet' : {x:32985, y:31540},
	'Svargrond Carpet' : {x:32253, y:31099},
	'Issavi Carpet' : {x:33959, y:31515},
};

export function toTibiaCoord(point)
{
	let ret = point.copy();
	ret.x += 31744;
	ret.y += 30976;
	return ret;
}

export function fromTibiaCoord(point){
	let ret = point.copy();
	ret.x -= 31744;
	ret.y -= 30976;
	return ret;
}

export function getValues(key){
	if (key in places) {
        return new Point (places[key].x, places[key].y);
    }
	const match = key.match(/^\((\d{5})\s*,\s*(\d{5})\)$/);
    if (match) {
        return new Point (parseInt(match[1], 10), parseInt(match[2], 10));
    }
    return null;
}