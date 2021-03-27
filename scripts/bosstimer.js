var questList = [
  {
    name: "Common Rotation Bosses",
    bosses: [
      { name: "Urmahlullu", hours: 21 },
      { name: "Scarlett", hours: 21 },
      { name: "Oberon", hours: 21 },
      { name: "Drume", hours: 21 },
      { name: "Mini Arena", hours: 21 },
      { name: "Final Arena", hours: 21 },
      { name: "Graves", hours: 21 },
      { name: "Zelos", hours: 21 },
      { name: "Mini Vengoth", hours: 21 },
      { name: "Final Vengoth", hours: 21 },
      { name: "Faceless Bane", hours: 21 },
      { name: "Brokul", hours: 21 },
      { name: "Leiden", hours: 21 },
      { name: "Lion Bosses", hours: 21 },
      { name: "Were Bosses", hours: 21 },
      { name: "Golds", hours: 21 },
      { name: "Golds Final", hours: 337 },
      { name: "Feru Final", hours: 337 },
    ],
  },
  {
    name: "Forgotten Knowledge",
    bosses: [
      { name: "Lady Tenebris", hours: 21 },
      { name: "Lloyd", hours: 21 },
      { name: "The Enraged Thorn Knight", hours: 21 },
      { name: "Soul of Dragonking Zyrtarch", hours: 21 },
      { name: "Melting Frozen Horror", hours: 21 },
      { name: "The Time Guardian", hours: 21 },
      { name: "The Last Lore Keeper", hours: 337 },
    ],
  },
  {
    name: "Pirat Bosses",
    bosses: [
      { name: "Tentugly", hours: 21 },
      { name: "Ratmiral", hours: 21 },
    ],
  },
  {
    name: "Ferumbras Mini",
    bosses: [
      { name: "Mazoran", hours: 49 },
      { name: "Plagirath", hours: 49 },
      { name: "Ragiaz", hours: 49 },
      { name: "Razzagorn", hours: 49 },
      { name: "Shulgrax", hours: 49 },
      { name: "Tarbaz", hours: 49 },
      { name: "Zamulosh", hours: 49 },
    ],
  },
  {
    name: "Secret Library",
    bosses: [
      { name: "Lokathmor", hours: 21 },
      { name: "Mazzinor", hours: 21 },
      { name: "Gorzindel", hours: 21 },
      { name: "Ghulosh", hours: 21 },
      { name: "The Scourge Of Oblivion", hours: 21 },
    ],
  },
  {
    name: "Cults of Tibia",
    bosses: [
      { name: "Essence Of Malice", hours: 21 },
      { name: "The Armored Voidborn", hours: 21 },
      { name: "The False God", hours: 21 },
      { name: "The Sandking", hours: 21 },
      { name: "The Souldespoiler", hours: 21 },
      { name: "The Source Of Corruption", hours: 21 },
    ],
  },
  {
    name: "Feaster of Souls",
    bosses: [
      { name: "Brain Head", hours: 21 },
      { name: "Unaz The Mean", hours: 21 },
      { name: "Irgix The Flimsy", hours: 21 },
      { name: "Vok The Freakish", hours: 21 },
    ],
  },
  {
    name: "Opticording Sphere",
    bosses: [
      { name: "An Observer Eye", hours: 21 },
      { name: "Last Planegazer", hours: 169 },
      { name: "Planestrider", hours: 21 },
    ],
  },
  {
    name: "Feyrist",
    bosses: [{ name: "Kroazur", hours: 2 }],
  },
];

function init() {
  var mainDiv = document.getElementById("quest-boss-list");

  questList.forEach(function (quest) {
    var title = document.createElement("h3");
    title.appendChild(document.createTextNode(quest.name));

    mainDiv.appendChild(title);

    var list = document.createElement("ul");

    quest.bosses.forEach(function (boss) {
      var bossDiv = document.createElement("li");
      bossDiv.addEventListener(
        "click",
        function () {
          startTimer(boss);
        },
        false
      );

      // Name
      var nameTag = document.createElement("p");
      nameTag.classList.add("boss-name");
      nameTag.appendChild(document.createTextNode(boss.name));
      bossDiv.appendChild(nameTag);

      // Image
      var imgDiv = document.createElement("div");
      imgDiv.classList.add("boss-image");
      var img = new Image();
      img.src = "images/bosses/" + nameUnderscore(boss.name) + ".gif";
      imgDiv.appendChild(img);
      bossDiv.append(imgDiv);

      // Timer
      var timerTag = document.createElement("p");
      timerTag.classList.add("boss-timer");
      timerTag.id = nameUnderscore(boss.name) + "_timer";
      timerTag.appendChild(document.createTextNode("--:--:--"));
      bossDiv.appendChild(timerTag);

      list.appendChild(bossDiv);

      bossSetTimer(boss);
    });

    mainDiv.appendChild(list);
  });

  questList.forEach(function (quest) {
    quest.bosses.forEach(function (boss) {
      var cookie = getCookie(nameUnderscore(boss.name));
      current_date = new Date();
      boss_expiry_date = new Date(cookie);
      if (boss_expiry_date < current_date) {
        var div = document.getElementById(nameUnderscore(boss.name) + "_timer");
        time_difference_in_ms =
          current_date.getTime() - boss_expiry_date.getTime();
        time_difference_in_sec = Math.round(time_difference_in_ms / 1000);
        time_difference_in_min = Math.round(time_difference_in_sec / 60);

        if (time_difference_in_min > 60) {
          time_difference_in_hr = Math.round(time_difference_in_min / 60);
          div.innerHTML =
            "expired<br> " + String(time_difference_in_hr) + " hours ago";
        } else {
          div.innerHTML =
            "expired<br> " + String(time_difference_in_min) + " min ago";
        }
      }
    });
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
  if (cookie == "" || new Date(cookie) < new Date()) {
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
  var div = document.getElementById(nameUnderscore(boss.name) + "_timer");

  var text = "";
  if (time.days > 1) {
    text += time.days + " days ";
  } else if (time.days == 1) {
    text += time.days + " day ";
  }

  text +=
    ("0" + time.hours).slice(-2) +
    ":" +
    ("0" + time.minutes).slice(-2) +
    ":" +
    ("0" + time.seconds).slice(-2);

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
    seconds,
  };
}

function setCookieBoss(name, value, hours) {
  var expires = "";
  // never gets called?
  if (hours) {
    var date = new Date();
    date.setTime(date.getTime() + hours * 60 * 60 * 1000);
    expires = "; expires=" + date.toUTCString();
  }
  document.cookie =
    name +
    "=" +
    (value || "") +
    expires +
    "; path=/; SameSite=Strict; max-age=31536000;";
}

function getCookie(cname) {
  var name = cname + "=";
  var decodedCookie = decodeURIComponent(document.cookie);
  var ca = decodedCookie.split(";");
  for (var i = 0; i < ca.length; i++) {
    var c = ca[i];
    while (c.charAt(0) == " ") {
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
  document.querySelector(".cookieconsent").style.display = "none";
  localStorage.setItem("cookieconsent", true);
}
