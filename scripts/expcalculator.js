function submit_form() {
  expcalculatorresults = document.getElementById("expcalculatorresults")
  expcalculatorresults.innerHTML = ""

  startinglevel = document.getElementById("startinglevel").value
  targetlevel = document.getElementById("targetlevel").value
  exp_per_hour = document.getElementById("exp").value

  total_experience_needed = calculate_experience(startinglevel, targetlevel)
  if (typeof total_experience_needed === 'string') {
    expcalculatorresults.innerHTML = total_experience_needed
  }
  else {
    formatted_experience = numberWithSpaces(total_experience_needed)
    expcalculatorresults.innerHTML = "Total experience needed to get from level <b>" + startinglevel + "</b> to <b>" + targetlevel + "</b> is:<br><br> <b><span class=\"orange\">" + formatted_experience + "</span></b><br>"
    // "intelligent" parsing of exp_per_hour, example 1.4kk = 140000
    exp_per_hour = (function(){
        exp_per_hour=exp_per_hour.toLowerCase();
        // the endsWith function is only for Internet Explorer compatibility, 
        // if we don't need IE support, we can drop this for the modern String.prototype.endsWith.
        let endsWith = function(str, needle){
            return str.substring(str.length - needle.length) === needle;
        };
        if(endsWith(exp_per_hour, "kk")){
            return Number(exp_per_hour.substring(0, exp_per_hour.length - "kk".length)) * 1000000;
        }
        if(endsWith(exp_per_hour, "k")){
            return Number(exp_per_hour.substring(0, exp_per_hour.length - "k".length)) * 1000;
        }
        if(endsWith(exp_per_hour, "m")){
            // million, same as kk
            return Number(exp_per_hour.substring(0, exp_per_hour.length - "m".length)) * 1000000;
        }
        if(endsWith(exp_per_hour, "b")){
            // billion (OT players may appreciate this)
            return Number(exp_per_hour.substring(0, exp_per_hour.length - "b".length)) * 1000000000;
        }
        if(endsWith(exp_per_hour, "t")){
          // trillion, questionable usefulness
          return Number(exp_per_hour.substring(0, exp_per_hour.length - "t".length)) * 1000000000000;
        }
        return Number(exp_per_hour);
    })();
    if (exp_per_hour > 0) {
      let days_needed = (total_experience_needed / exp_per_hour) / 24;
      let hours_needed = (days_needed - parseInt(days_needed)) * 24;
      let minutes_needed = (hours_needed - parseInt(hours_needed)) * 60;
      let seconds_needed = (minutes_needed - parseInt(minutes_needed)) * 60;
      let time_to_target_level = "Time needed to reach target level: " + Math.floor(days_needed) + " day(s), " + Math.floor(hours_needed) + " hour(s), " + Math.floor(minutes_needed) + " minute(s) and " + Math.round(seconds_needed) + " second(s).";
      expcalculatorresults.innerHTML = expcalculatorresults.innerHTML + "<br>" + time_to_target_level
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
