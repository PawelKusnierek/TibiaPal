function submit_form() {
    stamina = document.getElementById("staminalevel").value
    content = document.getElementById("staminaresults")
    content.innerHTML = "";
    duration = findTimeToRenegerate(stamina)

    if (duration == "invalid input") {
        content.innerHTML = content.innerHTML + duration
    }
    else if (duration >= 1440) {
        days = (duration - (duration%1440)) / 1440
        duration = duration - (days * 1440)
        if (duration >= 60) {
            hours = (duration - (duration%60)) / 60
            duration = duration - (hours * 60)
            content.innerHTML = content.innerHTML + "To get from " + stamina + " to full stamina, you need to rest for<b> " + days + " days, " + hours + " hours and " + duration + " minutes</b>."
        }
        else {
            content.innerHTML = content.innerHTML + "To get from " + stamina + " to full stamina, you need to rest for<b> " + days + " days, 0 hours and " + duration + " minutes</b>."
        }
    }
    else {
        if (duration >= 60) {
            hours = (duration - (duration%60)) / 60
            duration = duration - (hours * 60)
            content.innerHTML = content.innerHTML + "To get from " + stamina + " to full stamina, you need to rest for<b> " + hours + " hours and " + duration + " minutes</b>."
        }
        else {
            content.innerHTML = content.innerHTML + "To get from " + stamina + " to full stamina, you need to rest for<b> " + duration + " minutes</b>."
        }
    }
}

function findTimeToRenegerate(stamina) {
    hours = parseInt(stamina.substring(0, 2))
    minutes = parseInt(stamina.substring(3, 5))
    if(minutes > 60) {
        return "invalid input"
    }
    else if (hours >= 42) {
        return "0"
    }
    else if (hours < 39) {
        hours_remaining = 38 - hours
        minutes_remaining = 60 - minutes
        return ((hours_remaining * 180) + (minutes_remaining * 3) + 1080)
    }
    else {
        hours_remaining = 41 - hours
        minutes_remaining = 60 - minutes
        return ((hours_remaining * 360) + (minutes_remaining * 6))
    }
}