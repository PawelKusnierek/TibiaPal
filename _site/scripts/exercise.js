//Each weapon is equivalent to 300k mana points - 600 ultimate mana potions * 500 average value, and all vocs progress their main skill at the same rate with the weapons
function submit_exercise_form() {
  points_main_skill_regular_weapon = 300000;
  points_main_skill_durable_weapon = points_main_skill_regular_weapon * 3.6;
  points_main_skill_lasting_weapon = points_main_skill_regular_weapon * 28.8;

  cost_regular_k = 347.222
  cost_regular_tc = 25

  cost_durable_k = 1250
  cost_durable_tc = 90

  cost_lasting_k = 10000
  cost_lasting_tc = 720

  magic_skill_constant = 1600;
  main_magic_constant = 1.1;

  exerciseformrvalues = document.getElementById("vocation_exercise_form");
  exerciseformresults = document.getElementById("exerciseformresults");
  exerciseformresults.innerHTML = ""

  vocation_and_type = document.getElementById("vocation").value;
  currentskill = document.getElementById("currentskill").value;
  currentskillpercentage = document.getElementById("currentskillpercentage").value;
  if (currentskillpercentage.includes(",")) {
    currentskillpercentage = currentskillpercentage.replace(",", ".")
  }

  targetskill = document.getElementById("targetskill").value;
  loyalty = document.getElementById("loyalty").value;
  IsDummy = document.getElementById("dummy").checked;
  IsEvent = document.getElementById("event").checked;

  vocation_constant = 1.1

  if (vocation_and_type == "Paladin Magic") {
    vocation_constant = 1.4
  }
  else if (vocation_and_type == "Monk Magic") {
    vocation_constant = 1.25
  }


  points_required = main_skill_calculation_points_required(vocation_constant, currentskill, currentskillpercentage, targetskill, IsDummy, IsEvent, 0)

  regular_weapons_required = Math.ceil(points_required / (points_main_skill_regular_weapon * (1 + (loyalty / 100))))
  durable_weapons_required = Math.ceil(points_required / (points_main_skill_durable_weapon * (1 + (loyalty / 100))))
  lasting_weapons_required = Math.ceil(points_required / (points_main_skill_lasting_weapon * (1 + (loyalty / 100))))

  regular_k_or_kk = "k"
  regular_cost = regular_weapons_required * cost_regular_k
  regular_cost_tc = regular_weapons_required * cost_regular_tc

  if (Math.round(regular_cost) > 1000) {
    regular_cost = regular_cost / 1000
    regular_k_or_kk = "kk"
  }

  durable_k_or_kk = "k"
  durable_cost = durable_weapons_required * cost_durable_k
  durable_cost_tc = durable_weapons_required * cost_durable_tc
  if (Math.round(durable_cost) > 1000) {
    durable_cost = durable_cost / 1000
    durable_k_or_kk = "kk"
  }

  lasting_k_or_kk = "k"
  lasting_cost = lasting_weapons_required * cost_lasting_k
  lasting_cost_tc = lasting_weapons_required * cost_lasting_tc
  if (Math.round(lasting_cost) > 1000) {
    lasting_cost = lasting_cost / 1000
    lasting_k_or_kk = "kk"
  }

  //filling out the html after calculation
  IsTCOver10500 = IsDummy = document.getElementById("tc_price").checked;

  if (IsTCOver10500) {
    exerciseformresults.innerHTML = "To get from skill " + currentskill + " to skill " + targetskill + ", you need to use a total of: <br><br><b>"
      + regular_weapons_required + " regular exercise weapons</b>, at a cost of " + regular_cost + regular_k_or_kk + ", time required: " + Math.floor(regular_weapons_required / 3.6) + " hours and " + Math.round((regular_weapons_required % 3.6) * 16.67) + " minutes<br><br><b>"
      + durable_weapons_required + " durable exercise weapons</b>, at a cost of " + durable_cost + durable_k_or_kk + ", time required: " + durable_weapons_required + " hours<br><br><b>"
      + lasting_weapons_required + " lasting exercise weapons</b>, at a cost of " + lasting_cost + lasting_k_or_kk + ", time required: " + lasting_weapons_required * 8 + " hours"
  }
  else {
    exerciseformresults.innerHTML = "To get from skill " + currentskill + " to skill " + targetskill + ", you need to use a total of: <br><br><b>"
      + regular_weapons_required + " regular exercise weapons</b>, at a cost of " + regular_cost_tc + " Tibia Coins, time required: " + Math.floor(regular_weapons_required / 3.6) + " hours and " + Math.round((regular_weapons_required % 3.6) * 16.67) + " minutes<br><br><b>"
      + durable_weapons_required + " durable exercise weapons</b>, at a cost of " + durable_cost_tc + " Tibia Coins, time required: " + durable_weapons_required + " hours<br><br><b>"
      + lasting_weapons_required + " lasting exercise weapons</b>, at a cost of " + lasting_cost_tc + " Tibia Coins, time required: " + lasting_weapons_required * 8 + " hours"
  }

}

function main_skill_calculation_points_required(vocation_constant, currentskill, currentskillpercentage, targetskill, IsDummy, IsEvent, skill_offset) {
  current_skill_total_points = total_skill_points_at_given_level(1600, vocation_constant, parseInt(currentskill) + 1, skill_offset)
  points_to_next_skill = points_to_next_skill_level(1600, vocation_constant, parseInt(currentskill), skill_offset) * (currentskillpercentage / 100)
  target_skill_total_points = total_skill_points_at_given_level(1600, vocation_constant, targetskill, skill_offset)

  total_points_needed_for_target = (target_skill_total_points - (current_skill_total_points - points_to_next_skill))
  // / (1 + (loyalty / 100))

  if (IsEvent) {
    total_points_needed_for_target = total_points_needed_for_target / 2
  }
  if (IsDummy) {
    total_points_needed_for_target = total_points_needed_for_target / 1.1
  }

  return total_points_needed_for_target
}

function points_to_next_skill_level(skill_constant, vocation_constant, skill, skill_offset) {
  exponent = Math.pow(vocation_constant, skill - skill_offset)
  total_points = skill_constant * exponent
  return total_points
}

function total_skill_points_at_given_level(skill_constant, vocation_constant, skill, skill_offset) {
  exponent = Math.pow(vocation_constant, skill - skill_offset)
  total_points = skill_constant * ((exponent - 1) / (vocation_constant - 1))
  return total_points
}