var questList = [
	{
		name: "Common Rotation Bosses",
		bosses: [
			{ name: "Urmahlullu", hours: 20 },
			{ name: "Scarlett", hours: 20 },
			{ name: "Oberon", hours: 20 },
			{ name: "Drume", hours: 20 },
			{ name: "Mini Arena", hours: 20 },
			{ name: "Final Arena", hours: 20 },
			{ name: "Graves", hours: 20 },
			{ name: "Zelos", hours: 20 },
			{ name: "Mini Vengoth", hours: 20 },
			{ name: "Final Vengoth", hours: 20 },
			{ name: "Faceless Bane", hours: 20 },
			{ name: "Brokul", hours: 20 },
			{ name: "Leiden", hours: 20 },
			{ name: "Lion Bosses", hours: 20 },
			{ name: "Were Bosses", hours: 20 },
			{ name: "Golds", hours: 20 },
			{ name: "Golds Final", hours: 336 },
			{ name: "Feru Final", hours: 336 },
		]
	},
	{
		name: "Forgotten Knowledge",
		bosses: [
			{ name: "Lady Tenebris", hours: 20 },
			{ name: "Lloyd", hours: 20 },
			{ name: "The Enraged Thorn Knight", hours: 20 },
			{ name: "Soul of Dragonking Zyrtarch", hours: 20 },
			{ name: "Melting Frozen Horror", hours: 20 },
			{ name: "The Time Guardian", hours: 20 },
			{ name: "The Last Lore Keeper", hours: 336 },
		]
	},
	{
		name: "Pirat Bosses",
		bosses: [
			{ name: "Tentugly", hours: 20 },
			{ name: "Ratmiral", hours: 20 },
		]
	},
	{
		name: "Ferumbras Mini",
		bosses: [
			{ name: "Mazoran", hours: 48 },
			{ name: "Plagirath", hours: 48 },
			{ name: "Ragiaz", hours: 48 },
			{ name: "Razzagorn", hours: 48 },
			{ name: "Shulgrax", hours: 48 },
			{ name: "Tarbaz", hours: 48 },
			{ name: "Zamulosh", hours: 48 },
		]
	},
	{
		name: "Secret Library",
		bosses: [
			{ name: "Lokathmor", hours: 20 },
			{ name: "Mazzinor", hours: 20 },
			{ name: "Gorzindel", hours: 20 },
			{ name: "Ghulosh", hours: 20 },
			{ name: "The Scourge Of Oblivion", hours: 20 },
		]
	},
	{
		name: "Cults of Tibia",
		bosses: [
			{ name: "Essence Of Malice", hours: 20 },
			{ name: "The Armored Voidborn", hours: 20 },
			{ name: "The False God", hours: 20 },
			{ name: "The Sandking", hours: 20 },
			{ name: "The Souldespoiler", hours: 20 },
			{ name: "The Source Of Corruption", hours: 20 },
		]
	},
	{
		name: "Feaster of Souls",
		bosses: [
			{ name: "Brain Head", hours: 20 },
			{ name: "Unaz The Mean", hours: 20 },
			{ name: "Irgix The Flimsy", hours: 20 },
			{ name: "Vok The Freakish", hours: 20 },
		]
	},
	{
		name: "Opticording Sphere",
		bosses: [
			{ name: "An Observer Eye", hours: 20 },
			{ name: "Last Planegazer", hours: 20 },
			{ name: "Planestrider", hours: 20 },
		]
	},
	{
		name: "Feyrist",
		bosses: [
			{ name: "Kroazur", hours: 2 },
		]
	}
];

function init() {
	var mainDiv = document.getElementById('quest-boss-list');

	questList.forEach(function (quest) {

		var title = document.createElement('h3');
		title.appendChild(document.createTextNode(quest.name))

		mainDiv.appendChild(title);

		var list = document.createElement('ul');

		quest.bosses.forEach(function (boss) {

			var bossDiv = document.createElement('li');
			bossDiv.addEventListener('click', function () {
				startTimer(boss);
			}, false);

			// Name
			var nameTag = document.createElement('p');
			nameTag.classList.add("boss-name");
			nameTag.appendChild(document.createTextNode(boss.name));
			bossDiv.appendChild(nameTag);

			// Image
			var imgDiv = document.createElement('div');
			imgDiv.classList.add("boss-image");
			var img = new Image();
			img.src = "images/bosses/" + nameUnderscore(boss.name) + ".gif";
			imgDiv.appendChild(img);
			bossDiv.append(imgDiv);

			// Timer
			var timerTag = document.createElement('p');
			timerTag.classList.add("boss-timer");
			timerTag.id = nameUnderscore(boss.name) + '_timer';
			timerTag.appendChild(document.createTextNode("--:--:--"));
			bossDiv.appendChild(timerTag);


			list.appendChild(bossDiv);

			bossSetTimer(boss);
		});

		mainDiv.appendChild(list);
	});
}

function startTimer(boss) {
	var date = new Date();
	date.setHours(date.getHours() + boss.hours);

	setCookieBoss(nameUnderscore(boss.name), date);

	if (boss.timer) {
		clearInterval(boss.timer);
	}

	setTimer(boss, getTimeRemaining(getCookie(nameUnderscore(boss.name))));

	bossSetTimer(boss);
}

function bossSetTimer(boss) {

	var cookie = getCookie(nameUnderscore(boss.name));

	// If expire remove cookie
	if (cookie == '' || new Date(cookie) < new Date()) {
		return;
	}

	boss.timer = setInterval(() => {
		var t = getTimeRemaining(cookie);
		setTimer(boss, t);

		if (t.total <= 0) {
			clearInterval(boss.timer);
		}


	}, 1000);

}

function setTimer(boss, time) {
	var div = document.getElementById(nameUnderscore(boss.name) + '_timer');

	var text = "";
	if (time.days > 0) {
		text += time.days + " days ";
	}

	text += ('0' + time.hours).slice(-2) + ':' + ('0' + time.minutes).slice(-2) + ':' + ('0' + time.seconds).slice(-2)

	div.innerHTML = text;
}

function getTimeRemaining(endtime) {
	const total = Date.parse(endtime) - Date.parse(new Date());
	const seconds = Math.floor((total / 1000) % 60);
	const minutes = Math.floor((total / 1000 / 60) % 60);
	const hours = Math.floor((total / (1000 * 60 * 60)) % 24);
	const days = Math.floor(total / (1000 * 60 * 60 * 24));

	return {
		total,
		days,
		hours,
		minutes,
		seconds
	};
}

function setCookieBoss(name, value, hours) {
	var expires = "";
	if (hours) {
		var date = new Date();
		date.setTime(date.getTime() + hours * 60 * 60 * 1000);
		expires = "; expires=" + date.toUTCString();
	}
	document.cookie = name + "=" + (value || "") + expires + "; path=/; SameSite=Strict; max-age=31536000;";
}

function getCookie(cname) {
	var name = cname + "=";
	var decodedCookie = decodeURIComponent(document.cookie);
	var ca = decodedCookie.split(';');
	for (var i = 0; i < ca.length; i++) {
		var c = ca[i];
		while (c.charAt(0) == ' ') {
			c = c.substring(1);
		}
		if (c.indexOf(name) == 0) {
			return c.substring(name.length, c.length);
		}
	}
	return "";
}

function nameUnderscore(name) {
	return name.replace(/ /g, "_").toLowerCase();
}


function cookieConsentClicked() {
	document.querySelector('.cookieconsent').style.display = 'none';
	localStorage.setItem('cookieconsent', true);
};