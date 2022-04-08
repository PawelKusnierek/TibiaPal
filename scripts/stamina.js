function submit_form() {
    let stamina = document.getElementById("staminalevel").value;
    let targetStamina = document.getElementById("targetstamina").value;
    let content = document.getElementById("staminaresults");
    content.innerHTML = "";

    if (targetStamina) {
        var timeToFullStamina = findTimeToRenegerateTargetStamina(stamina, targetStamina);
    }
    else {
        var timeToFullStamina = findTimeToRenegerate(stamina);
    }
    const fullStaminaDate = calcFullStaminaDate(timeToFullStamina * 60 * 1000);
    const fullStaminaInfo = 'Your stamina will be full at ' + fullStaminaDate;

    if (timeToFullStamina === "invalid input") {
        content.innerHTML = content.innerHTML + timeToFullStamina
    }
    else if (timeToFullStamina >= 1440) {
        let days = (timeToFullStamina - (timeToFullStamina % 1440)) / 1440
        timeToFullStamina = timeToFullStamina - (days * 1440)
        if (timeToFullStamina >= 60) {
            let hours = (timeToFullStamina - (timeToFullStamina % 60)) / 60
            timeToFullStamina = timeToFullStamina - (hours * 60)
            content.innerHTML = "To get from " + stamina + " to full stamina, you need to rest for <b>" + days + " days, " + hours + " hours and " + timeToFullStamina + " minutes</b>.<br>" + fullStaminaInfo;
        }
        else {
            content.innerHTML = "To get from " + stamina + " to full stamina, you need to rest for <b>" + days + " days, 0 hours and " + timeToFullStamina + " minutes</b>.<br>" + fullStaminaInfo;
        }
    }
    else {
        if (timeToFullStamina >= 60) {
            let hours = (timeToFullStamina - (timeToFullStamina % 60)) / 60
            timeToFullStamina = timeToFullStamina - (hours * 60)
            content.innerHTML = "To get from " + stamina + " to full stamina, you need to rest for <b>" + hours + " hours and " + timeToFullStamina + " minutes</b>.<br>" + fullStaminaInfo;
        }
        else {
            content.innerHTML = "To get from " + stamina + " to full stamina, you need to rest for <b>" + timeToFullStamina + " minutes</b>.<br>" + fullStaminaInfo;
        }
    }
}

function calcFullStaminaDate(millisToFullStamina) {
    const now = new Date();
    const fullStaminaTimestamp = now.getTime() + millisToFullStamina;
    return new Date(fullStaminaTimestamp).toLocaleString();
}

function findTimeToRenegerate(stamina) {
    let hours = parseInt(stamina.substring(0, 2))
    let minutes = parseInt(stamina.substring(3, 5))
    if (minutes > 60) {
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

function findTimeToRenegerateTargetStamina(currentStamina, targetStamina) {
    let currentHours = parseInt(currentStamina.substring(0, 2))
    let currentMinutes = parseInt(currentStamina.substring(3, 5))

    let targetHours = parseInt(targetStamina.substring(0, 2))
    let targetMinutes = parseInt(targetStamina.substring(3, 5))

    if ((currentMinutes > 60) || (targetMinutes > 60)) {
        return "invalid input"
    }
    else if (currentHours >= 42) {
        return "0"
    }
    else if ((currentHours < 39) && (targetHours < 39)) {
        hours_remaining = targetHours - currentHours
        minutes_remaining = targetMinutes - currentMinutes
        return ((hours_remaining * 180) + (minutes_remaining * 3))
    }
    else if ((currentHours >= 39) && (targetHours >= 39)) {
        hours_remaining = targetHours - currentHours
        minutes_remaining = targetMinutes - currentMinutes
        return ((hours_remaining * 360) + (minutes_remaining * 6))
    }
    else {
        hours_remaining = 38 - currentHours
        minutes_remaining = 60 - currentMinutes

        return ((hours_remaining * 180) + (minutes_remaining * 3) + ((targetHours - 39) * 360) + (targetMinutes * 6))
    }
}

