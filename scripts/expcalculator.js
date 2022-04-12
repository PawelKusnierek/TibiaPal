function submit_form() {
  expcalculatorresults = document.getElementById("expcalculatorresults")
  expcalculatorresults.innerHTML = ""

  startinglevel = document.getElementById("startinglevel").value
  targetlevel = document.getElementById("targetlevel").value

  total_experience_needed = calculate_experience(startinglevel, targetlevel)
  if (typeof total_experience_needed === 'string' ) {
    expcalculatorresults.innerHTML = total_experience_needed
  }
  else {
    formatted_experience = numberWithSpaces(total_experience_needed)
    expcalculatorresults.innerHTML = "Total experience needed to get from level <b>" + startinglevel + "</b> to <b>" + targetlevel + "</b> is:<br><br> <b><span class=\"orange\">" + formatted_experience + "</span></b><br>"
  }
}
//Can return results off by one due to rounding, but not a significant difference
function experience_for_level(level) {
  // special case n=1
  if (level === 1) {
    return 0;
  }
  else if (level < 1) {
    return "Levels less than one not possible"
  }
  return ((50 * Math.pow(level, 3)) / 3) - (100 * Math.pow(level, 2)) + (((850 * level) / 3) - 200);
}
function calculate_experience(startinglevel, targetlevel) {
  target_exp = experience_for_level(targetlevel)
  starting_exp = experience_for_level(startinglevel)
  if (typeof target_exp === 'string' || typeof starting_exp === 'string') {
    return "Levels less than one not possible"
  }
  else {
    return Math.round(target_exp) - Math.round(starting_exp);
  }
}

function numberWithSpaces(x) {
  return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}
