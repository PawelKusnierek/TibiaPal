function initialize() {
  //cookie_notice();
  //find_rashid_city();
  enable_expandable_div_buttons();
  enable_default_tabs();
}

function find_rashid_city() {
  time = new Intl.DateTimeFormat("en-GB", {
    dateStyle: "full",
    timeStyle: "short",
    timeZone: "Europe/Berlin",
  }).format(new Date());
  first_comma = time.indexOf(",");
  day = time.substring(0, first_comma);
  hour = parseInt(time.substring(time.length - 5, time.length - 3));

  content_city = document.getElementById("rashid-city");

  if (hour > 9) {
    city = find_city_based_on_day(day);
    content_city.innerHTML = "Rashid in " + city;
  } else {
    previous_day = find_previous_day(day);
    city = find_city_based_on_day(previous_day);
    content_city.innerHTML = "Rashid in " + city;
  }
}

function find_city_based_on_day(day) {
  if (day == "Monday") {
    return "Svargrond";
  } else if (day == "Tuesday") {
    return "Liberty Bay";
  } else if (day == "Wednesday") {
    return "Port Hope";
  } else if (day == "Thursday") {
    return "Ankrahmun";
  } else if (day == "Friday") {
    return "Darashia";
  } else if (day == "Saturday") {
    return "Edron";
  } else if (day == "Sunday") {
    return "Carlin";
  }
}

function find_previous_day(day) {
  if (day == "Monday") {
    return "Sunday";
  } else if (day == "Tuesday") {
    return "Monday";
  } else if (day == "Wednesday") {
    return "Tuesday";
  } else if (day == "Thursday") {
    return "Wednesday";
  } else if (day == "Friday") {
    return "Thursday";
  } else if (day == "Saturday") {
    return "Friday";
  } else if (day == "Sunday") {
    return "Saturday";
  }
}

function enable_expandable_div_buttons() {
  var coll = document.getElementsByClassName("expandable-div");
  var i;

  for (i = 0; i < coll.length; i++) {
    coll[i].addEventListener("click", function () {
      this.classList.toggle("active-expanded-div");
      var content = this.nextElementSibling;
      if (content.style.display === "block") {
        content.style.display = "none";
      } else {
        content.style.display = "block";
      }
    });
  }
}

function cookie_notice() {
  cookies_consented = localStorage.getItem("cookieconsent");
  // if cookies not consented to, display cookie banner
  if (!cookies_consented) {
    document.querySelector(".cookieconsent").style.display = "initial";
  }
}

function cookieConsentClicked() {
  document.querySelector(".cookieconsent").style.display = "none";
  localStorage.setItem("cookieconsent", true);
}

function showAdblockPopup() {
  last_confirm_time = localStorage.getItem("adblockconfirm");
  if (last_confirm_time === undefined) {
    document.querySelector(".adblockpopup").style.display = "initial";
  }
  // checking if last pop-up was more than 30 days ago (in epoch time)
  else if (Date.now() - localStorage.getItem("adblockconfirm") > 2592000000) {
    document.querySelector(".adblockpopup").style.display = "initial";
  }
}

function adBlockPopupClicked() {
  document.querySelector(".adblockpopup").style.display = "none";
  localStorage.setItem("adblockconfirm", Date.now());
}

function enable_default_tabs() {
  if (location.href.split("/").slice(-1).includes('charm_planner')) {
    initial_show_tab("Major Charms")
  }
  else if(location.href.split("/").slice(-1).includes('equipment')) {
    initial_show_tab("Druid")
  }
  else if(location.href.includes('/hunting')) {
    initial_show_tab("Knight")
  }
  else if(location.href.includes('/monkcontest')) {
    initial_show_tab("Bounties")
  }
  else if(location.href.includes('/exercise')) {
    initial_show_tab("TargetSkill")
  }
  else if(location.href.includes('/offlinetraining')) {
    initial_show_tab("TargetSkill")
  }


}
function show_tab(evt, tab_name) {
  // Declare all variables
  var i, tabcontent, tablinks;

  // Get all elements with class="tabcontent" and hide them
  tabcontent = document.getElementsByClassName("tabcontent");
  for (i = 0; i < tabcontent.length; i++) {
    tabcontent[i].style.display = "none";
  }

  // Get all elements with class="tablinks" and remove the class "active"
  tablinks = document.getElementsByClassName("tablinks");
  for (i = 0; i < tablinks.length; i++) {
    tablinks[i].className = tablinks[i].className.replace(" active", "");
  }

  // Show the current tab, and add an "active" class to the button that opened the tab
  document.getElementById(tab_name).style.display = "block";
  evt.currentTarget.className += " active";
}

function initial_show_tab(tab_name) {
  // Declare all variables
  var i, tabcontent;

  // Get all elements with class="tabcontent" and hide them
  tabcontent = document.getElementsByClassName("tabcontent");
  for (i = 0; i < tabcontent.length; i++) {
    tabcontent[i].style.display = "none";
  }

  // Show the current tab
  document.getElementById(tab_name).style.display = "block";
}

function toggleNavigation() {
  var sidebar = document.getElementById('left-sidebar');
  var toggle = document.querySelector('.nav-toggle');
  
  if (sidebar.classList.contains('expanded')) {
    sidebar.classList.remove('expanded');
    toggle.textContent = '☰ Menu';
  } else {
    sidebar.classList.add('expanded');
    toggle.textContent = '✕ Close';
  }
}