function submit_form() {
  expcalculatorresults = document.getElementById("expcalculatorresults")
  expcalculatorresults.innerHTML = ""

  startinglevel = document.getElementById("startinglevel").value
  targetlevel = document.getElementById("targetlevel").value
  exp_per_hour = document.getElementById("exp").value
  hunt_per_day = document.getElementById("hunt_day").value

  total_experience_needed = calculate_experience(startinglevel, targetlevel)
  if (typeof total_experience_needed === 'string') {
    expcalculatorresults.innerHTML = total_experience_needed
  }
  else {
    formatted_experience = numberWithSpaces(total_experience_needed)
    expcalculatorresults.innerHTML = "Total experience needed to get from level <b>" + startinglevel + "</b> to <b>" + targetlevel + "</b> is:<br><br> <b><span class=\"orange\">" + formatted_experience + "</span></b><br>"
    if (exp_per_hour > 0) {
      exp_per_hour = exp_per_hour * 1000000;
      let total_seconds_needed = (total_experience_needed / exp_per_hour) * 60 * 60;
      let days_needed = (total_experience_needed / exp_per_hour) / 24;
      let hours_needed = (days_needed - parseInt(days_needed)) * 24;
      let minutes_needed = (hours_needed - parseInt(hours_needed)) * 60;
      let seconds_needed = (minutes_needed - parseInt(minutes_needed)) * 60;
      let time_to_target_level = "At " + exp_per_hour / 1000000 + " kk/h, hunting time needed to reach target level: " + (Math.floor(days_needed) * 24 + Math.floor(hours_needed)) + " hour(s)"
      if (hunt_per_day > 0) {
        total_seconds_needed = total_seconds_needed * 24 / hunt_per_day
        finished_time_string = (new Date(Date.now() + (total_seconds_needed * 1000))).toLocaleString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' });
        expcalculatorresults.innerHTML = expcalculatorresults.innerHTML + "<br>" + time_to_target_level + "<br><br>When hunting for " + hunt_per_day + " hours per day, you will reach your target level on: " + finished_time_string;
      }
      else {
        finished_time_string = (new Date(Date.now() + (total_seconds_needed * 1000))).toLocaleString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' });
        expcalculatorresults.innerHTML = expcalculatorresults.innerHTML + "<br>" + time_to_target_level + "<br><br>Which is: " + finished_time_string;
      }
    }
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
