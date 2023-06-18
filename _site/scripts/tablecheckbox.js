function init() {

    if (typeof localStorage.bosstiary_profiles != "undefined") {
                var existing_profiles = JSON.parse(localStorage.bosstiary_profiles);
        var select = document.getElementById("profile_dropdown");

        for (i = 0; i < existing_profiles.length; i++) {
            var option = document.createElement('option');
            option.value = existing_profiles[i]
            option.innerHTML = existing_profiles[i]
            select.appendChild(option)
        }

        var profile_dropdown = document.getElementById("profile_dropdown");
        profile_dropdown.addEventListener("change", profile_change);

        const inputs = document.getElementsByTagName("input");
        var profile_dropdown = document.getElementById("profile_dropdown");
        var current_profile = profile_dropdown.value;
        for (var i = 0; i < inputs.length; i++) {
            if (inputs[i].type == "checkbox") {
                boss_name = inputs[i].name
                boss_cookie = localStorage.getItem(current_profile + boss_name);
                if (boss_cookie == 'true') {
                    inputs[i].checked = true
                }
                inputs[i].addEventListener('change', checkbox_change);
            }
        }
    }
}

function checkbox_change() {
    if (typeof localStorage.bosstiary_profiles != "undefined") {
        var profile_dropdown = document.getElementById("profile_dropdown");
        var current_profile = profile_dropdown.value;

        boss_name = this.name
        isChecked = this.checked

        if (isChecked) {
            localStorage.setItem(current_profile + boss_name, true);
        }
        else {
            localStorage.setItem(current_profile + boss_name, false);
        }
    }
}

function profile_change() {
    var profile_dropdown = document.getElementById("profile_dropdown");
    var current_profile = profile_dropdown.value;
    const inputs = document.getElementsByTagName("input");
    for (var i = 0; i < inputs.length; i++) {
        if (inputs[i].type == "checkbox") {
            boss_name = inputs[i].name
            boss_cookie = localStorage.getItem(current_profile + boss_name);
            if (boss_cookie == 'true') {
                inputs[i].checked = true
            }
            else {
                inputs[i].checked = false
            }
        }
    }
}

function profile_name_submit_click() {
    var new_profile_name = document.getElementById("profile_name").value;
    var select = document.getElementById("profile_dropdown");
    if (typeof localStorage.bosstiary_profiles != "undefined") {
        var existing_profiles = JSON.parse(localStorage.bosstiary_profiles);

        if (existing_profiles.includes(new_profile_name)) {
            window.alert("Profile with this name already exists.");
            return
        } else {
            var option = document.createElement('option');
            option.value = new_profile_name
            option.innerHTML = new_profile_name
            select.appendChild(option)

            existing_profiles.push(new_profile_name)
            localStorage.setItem("bosstiary_profiles", JSON.stringify(existing_profiles));
            profile_change()
        }
    } else {
        var option = document.createElement('option');
        option.value = new_profile_name
        option.innerHTML = new_profile_name
        select.appendChild(option)
        var bosstiary_profiles = [];
        bosstiary_profiles.push(new_profile_name)
        localStorage.setItem("bosstiary_profiles", JSON.stringify(bosstiary_profiles));
    }
}

function profile_remove_submit_click() {
    if (typeof localStorage.bosstiary_profiles != "undefined") {
        var profile_dropdown = document.getElementById("profile_dropdown");
        var profile_to_remove = profile_dropdown.value;

        var existing_profiles = JSON.parse(localStorage.bosstiary_profiles);
        var index = existing_profiles.indexOf(profile_to_remove)
        if (index > -1) {
            existing_profiles.splice(index, 1);
        }
        localStorage.setItem("bosstiary_profiles", JSON.stringify(existing_profiles))
        for (var i = 0; i < profile_dropdown.length; i++) {
            if (profile_dropdown.options[i].value == profile_to_remove) profile_dropdown.remove(i);
        }
        profile_change()
    }
}