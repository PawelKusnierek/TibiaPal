function submit_form() {
    expcalculatorresults = document.getElementById("expcalculatorresults")
    expcalculatorresults.innerHTML = ""

    startinglevel = document.getElementById("startinglevel").value
    targetlevel = document.getElementById("targetlevel").value

    total_experience_needed = calculate_experience(startinglevel, targetlevel)

    formatted_experience = numberWithSpaces(total_experience_needed)
    expcalculatorresults.innerHTML = "Total experience needed to get from level <b>" + startinglevel + "</b> to <b>" + targetlevel + "</b> is:<br><br> <b><span class=\"orange\">" + formatted_experience + "</span></b><br>"
}

function experience_for_level(level) {
  return ((50 * Math.pow(level, 3)) / 3) - (100 * Math.pow(level, 2)) + (((850 * level) / 3) - 200);
}
function calculate_experience(startinglevel, targetlevel) {
    return experience_for_level(targetlevel) - experience_for_level(startinglevel);
}

function numberWithSpaces(x) {
    return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}
