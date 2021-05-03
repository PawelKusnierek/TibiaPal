function submit_exercise_form() {
  exerciseformresults = document.getElementById("vocation_exercise_form");

  vocation_and_type = document.getElementById("vocation").value;
  currentskill = document.getElementById("currentskill").value;
  currentskillpercentage = document.getElementById("currentskillpercentage")
    .value;
  targetskill = document.getElementById("targetskill").value;
  loyalty = document.getElementById("loyalty").value;
  IsDummy = document.getElementById("dummy").value;
  IsEvent = document.getElementById("event").value;

  if (vocation == "Druid/Sorcerer - Magic") {

    skill_type = "magic level";
  } else if (vocation == "Knight - Melee") {

    skill_type = "melee";
  } else if (vocation == "Paladin - Magic") {

    skill_type = "magic level";
  } else if (vocation == "Paladin - Distance") {

    skill_type = "distance";
  }


  exerciseformresults.innerHTML =
    "To get from " +
    currentskill +
    " " +
    skill_type +
    " to " +
    targetskill +
    " " +
    skill_type +
    ", you need to use a total of "
}
