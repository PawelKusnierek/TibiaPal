function find_rashid_city() {
    time = new Intl.DateTimeFormat('en-GB', { dateStyle: 'full', timeStyle: 'short', timeZone: 'Europe/Berlin' }).format(new Date());
    first_comma = time.indexOf(',')
    day = time.substring(0, first_comma)
    hour = parseInt(time.substring(time.length - 5, time.length - 3))

    content_city = document.getElementById("rashid-city")
    content_day = document.getElementById("rashid-day")

    if (hour > 9) {
        city = find_city_based_on_day(day)
        content_day.innerHTML = day + ":"
        content_city.innerHTML = city
    }
    else {
        previous_day = find_previous_day(day)
        city = find_city_based_on_day(previous_day)
        content_day.innerHTML = day + ":"
        content_city.innerHTML = city
    }
}

function find_city_based_on_day(day) {
    if (day == "Monday") {
        return 'Svargrond'
    }
    else if (day == "Tuesday") {
        return 'Liberty Bay'
    }
    else if (day == "Wednesday") {
        return 'Port Hope'

    }
    else if (day == "Thursday") {
        return 'Ankrahmun'

    }
    else if (day == "Friday") {
        return 'Darashia'

    }
    else if (day == "Saturday") {
        return 'Edron'

    }
    else if (day == "Sunday") {
        return 'Carlin'
    }
}

function find_previous_day(day) {
    if (day == "Monday") {
        return 'Sunday'
    }
    else if (day == "Tuesday") {
        return 'Monday'
    }
    else if (day == "Wednesday") {
        return 'Tuesday'

    }
    else if (day == "Thursday") {
        return 'Wednesday'

    }
    else if (day == "Friday") {
        return 'Thursday'

    }
    else if (day == "Saturday") {
        return 'Friday'

    }
    else if (day == "Sunday") {
        return 'Saturday'
    }
}