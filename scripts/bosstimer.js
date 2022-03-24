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
    ],
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
    ],
  },
  {
    name: "Pirat Bosses",
    bosses: [
      { name: "Tentugly", hours: 20 },
      { name: "Ratmiral", hours: 20 },
    ],
  },
  {
    name: "Warzones",
    bosses: [
      { name: "Warzone 1", hours: 20 },
      { name: "Warzone 2", hours: 20 },
      { name: "Warzone 3", hours: 20 },
      { name: "Warzone 4", hours: 4 },
      { name: "Warzone 5", hours: 4 },
      { name: "Warzone 6", hours: 4 },
      { name: "The Brainstealer", hours: 20 },
    ],
  },
  {
    name: "Issavi Mini",
    bosses: [
      { name: "Amenef The Burning", hours: 20 },
      { name: "Neferi The Spy", hours: 20 },
      { name: "Sister Hetai", hours: 20 },
    ],
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
    ],
  },
  {
    name: "Secret Library",
    bosses: [
      { name: "Lokathmor", hours: 20 },
      { name: "Mazzinor", hours: 20 },
      { name: "Gorzindel", hours: 20 },
      { name: "Ghulosh", hours: 20 },
      { name: "The Scourge Of Oblivion", hours: 20 },
    ],
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
    ],
  },
  {
    name: "Feaster of Souls",
    bosses: [
      { name: "Brain Head", hours: 20 },
      { name: "Unaz The Mean", hours: 20 },
      { name: "Irgix The Flimsy", hours: 20 },
      { name: "Vok The Freakish", hours: 20 },
    ],
  },
  {
    name: "Opticording Sphere",
    bosses: [
      { name: "Last Planegazer", hours: 168 },
      { name: "Planestrider", hours: 20 },
    ],
  },
  {
    name: "Misc",
    bosses: [
      { name: "Kroazur", hours: 2 },
      { name: "Oramond", minutes: 16, seconds: 40 },
    ],
  },
];

function init() {
  if (typeof localStorage.profiles != "undefined") {
    var existing_profiles = JSON.parse(localStorage.profiles);
    var select = document.getElementById("profile_dropdown");

    for (i = 0; i < existing_profiles.length; i++) {
      var option = document.createElement('option');
      option.value = existing_profiles[i]
      option.innerHTML = existing_profiles[i]
      select.appendChild(option)
    }
  }

  var profile_dropdown = document.getElementById("profile_dropdown");
  profile_dropdown.addEventListener("change", profile_change);

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

	  setTimeout(() => bossSetTimer(boss), 0);
    });

    mainDiv.appendChild(list);
  });

  questList.forEach(function (quest) {
    quest.bosses.forEach(function (boss) {
      var profile = document.getElementById("profile_dropdown").value;
      var profile_boss = profile + nameUnderscore(boss.name)
      var cookie = getCookie(profile_boss);
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
  if (boss.hours) {
    date.setHours(date.getHours() + boss.hours);
  }
  if (boss.minutes) {
    date.setMinutes(date.getMinutes() + boss.minutes);
  }
  if (boss.seconds) {
    date.setSeconds(date.getSeconds() + boss.seconds);
  }


  setCookieBoss(nameUnderscore(boss.name), date);

  if (boss.timer) {
    clearInterval(boss.timer);
  }

  var profile = document.getElementById("profile_dropdown").value;
  var profile_boss = profile + nameUnderscore(boss.name)
  setTimer(boss, getTimeRemaining(getCookie(profile_boss)));

  bossSetTimer(boss);
}

function bossSetTimer(boss) {
  var profile = document.getElementById("profile_dropdown").value;
  var profile_boss = profile + nameUnderscore(boss.name)
  var cookie = getCookie(profile_boss);

  // If expire remove cookie
  if (cookie == "" || new Date(cookie) < new Date()) {
    return;
  }

  var div = document.getElementById(nameUnderscore(boss.name) + "_timer");
  div.innerHTML = "--:--:--"
  var t = getTimeRemaining(cookie);
  setTimer(boss, t);

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
  var profile = document.getElementById("profile_dropdown").value;
  var profile_name = profile + name

  document.cookie =
    profile_name +
    "=" +
    (value || "") +
    expires +
    "; path=/; SameSite=Strict; max-age=31536000;";
}

function getCookie(cname) {
  var name = cname + "=";
  var decodedCookie = decodeURIComponent(document.cookie);
  var cookie_array = decodedCookie.split(";");
  for (var i = 0; i < cookie_array.length; i++) {
    var c = cookie_array[i];
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

function profile_change() {
  questList.forEach(function (quest) {
    quest.bosses.forEach(function (boss) {

      var div = document.getElementById(nameUnderscore(boss.name) + "_timer");
      div.innerHTML = "--:--:--"
      clearInterval(boss.timer);
      //double timer...
      bossSetTimer(boss);


      var profile = document.getElementById("profile_dropdown").value;
      var profile_boss = profile + nameUnderscore(boss.name)
      var cookie = getCookie(profile_boss);
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
  })
}

function profile_name_submit_click() {
  var new_profile_name = document.getElementById("profile_name").value;
  var select = document.getElementById("profile_dropdown");
  if (typeof localStorage.profiles != "undefined") {
    var existing_profiles = JSON.parse(localStorage.profiles);

    if (existing_profiles.includes(new_profile_name)) {
      window.alert("Profile with this name already exists.");
      return
    }
    else {
      var option = document.createElement('option');
      option.value = new_profile_name
      option.innerHTML = new_profile_name
      select.appendChild(option)

      existing_profiles.push(new_profile_name)
      localStorage.setItem("profiles", JSON.stringify(existing_profiles));
    }
  }
  else {
    var option = document.createElement('option');
    option.value = new_profile_name
    option.innerHTML = new_profile_name
    select.appendChild(option)
    var profiles = [];
    profiles.push(new_profile_name)
    localStorage.setItem("profiles", JSON.stringify(profiles));
  }
}

function profile_remove_submit_click() {
  if (typeof localStorage.profiles != "undefined") {
    var profile_dropdown = document.getElementById("profile_dropdown");
    var profile_to_remove = profile_dropdown.value;

    var existing_profiles = JSON.parse(localStorage.profiles);
    var index = existing_profiles.indexOf(profile_to_remove)
    if (index > -1) {
      existing_profiles.splice(index, 1);
    }
    localStorage.setItem("profiles", JSON.stringify(existing_profiles))
    for (var i = 0; i < profile_dropdown.length; i++) {
      if (profile_dropdown.options[i].value == profile_to_remove)
        profile_dropdown.remove(i);
    }
    profile_change()
  }
}
