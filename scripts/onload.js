function initialize() {
    find_rashid_city()
    find_stream_status()
}

function find_stream_status() {
    stream_content = document.getElementById("stream-content")




    var XML = new XMLHttpRequest();
    XML.open("GET", "https://api.twitch.tv/helix/streams/?user_login=kusnierr", true);
    XML.setRequestHeader("Client-ID", "qqiafa1gpappsi6jz2yq056ajcuxnu");
    XML.send();
    console.log(XML)
    XML.onload = function () {
        console.log(XML.response)
        response1 = JSON.parse(XML.response);
        var a = 1;
      }
    
}

function find_rashid_city() {
    time = new Intl.DateTimeFormat('en-GB', { dateStyle: 'full', timeStyle: 'short', timeZone: 'Europe/Berlin' }).format(new Date());
    first_comma = time.indexOf(',')
    day = time.substring(0, first_comma)
    hour = parseInt(time.substring(time.length - 5, time.length - 3))

    content_city = document.getElementById("rashid-city")

    if (hour > 9) {
        city = find_city_based_on_day(day)
        content_city.innerHTML = "Rashid in " + city
    }
    else {
        previous_day = find_previous_day(day)
        city = find_city_based_on_day(previous_day)
        content_city.innerHTML = "Rashid in " + city
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