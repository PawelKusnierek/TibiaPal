//Each weapon is equivalent to 300k mana points - 600 ultimate mana potions * 500 average value, and all vocs progress their main skill at the same rate with the weapons
function submit_exercise_form() {
  // Get the required field values
  const currentSkill = document.getElementById("currentskill").value;
  const targetSkill = document.getElementById("targetskill").value;
  
  // Check if the fields are empty or invalid
  if (!currentSkill || currentSkill.trim() === "") {
    alert("Please enter your current skill level. You cannot proceed without specifying your current skill.");
    document.getElementById("currentskill").focus();
    return;
  }
  
  if (!targetSkill || targetSkill.trim() === "") {
    alert("Please enter your target skill level. You cannot proceed without specifying your target skill.");
    document.getElementById("targetskill").focus();
    return;
  }
  
  // Validate that the values are numbers
  if (isNaN(currentSkill) || currentSkill <= 0) {
    alert("Please enter a valid current skill level (must be a positive number).");
    document.getElementById("currentskill").focus();
    return;
  }
  
  if (isNaN(targetSkill) || targetSkill <= 0) {
    alert("Please enter a valid target skill level (must be a positive number).");
    document.getElementById("targetskill").focus();
    return;
  }
  
  // Check if target skill is higher than current skill
  if (parseFloat(targetSkill) <= parseFloat(currentSkill)) {
    alert("Your target skill must be higher than your current skill level.");
    document.getElementById("targetskill").focus();
    return;
  }

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
    regular_cost = Math.round(regular_cost * 100) / 100
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
  IsTCOver13900 = IsDummy = document.getElementById("tc_price").checked;

  if (IsTCOver13900) {
    exerciseformresults.innerHTML = "To get from skill " + currentskill + " to skill " + targetskill + ", you need to use a total of: <br><br><b>"
      + regular_weapons_required + " regular exercise weapons</b>, at a cost of " + regular_cost + " " + regular_k_or_kk + ", time required: " + Math.floor(regular_weapons_required / 3.6) + " hours and " + Math.round((regular_weapons_required % 3.6) * 16.67) + " minutes<br><br><b>"
      + durable_weapons_required + " durable exercise weapons</b>, at a cost of " + durable_cost + " " + durable_k_or_kk + ", time required: " + durable_weapons_required + " hours<br><br><b>"
      + lasting_weapons_required + " lasting exercise weapons</b>, at a cost of " + lasting_cost + " " + lasting_k_or_kk + ", time required: " + lasting_weapons_required * 8 + " hours"
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

function submit_exercise_form_spend() {
  // Get the required field values
  const weaponCount = document.getElementById("weaponcount_spend").value;
  const currentSkill = document.getElementById("currentskill_spend").value;
  
  // Check if the number of weapons field is empty or invalid
  if (!weaponCount || weaponCount <= 0) {
    alert("Please enter a valid number of weapons. You cannot proceed without specifying how many exercise weapons you want to use.");
    document.getElementById("weaponcount_spend").focus();
    return;
  }
  
  // Check if the current skill field is empty or invalid
  if (!currentSkill || currentSkill.trim() === "") {
    alert("Please enter your current skill level. You cannot proceed without specifying your current skill.");
    document.getElementById("currentskill_spend").focus();
    return;
  }
  
  // Validate that the current skill value is a number
  if (isNaN(currentSkill) || currentSkill <= 0) {
    alert("Please enter a valid current skill level (must be a positive number).");
    document.getElementById("currentskill_spend").focus();
    return;
  }
  
  // If validation passes, proceed with the calculation
  calculate_skill_gain_from_weapons();
}

function calculate_skill_gain_from_weapons() {
  // Get form values
  const vocationAndType = document.getElementById("vocation_spend").value;
  const weaponType = document.getElementById("weapontype_spend").value;
  const weaponCount = parseInt(document.getElementById("weaponcount_spend").value);
  const currentSkill = parseFloat(document.getElementById("currentskill_spend").value);
  const currentSkillPercentage = parseFloat(document.getElementById("currentskillpercentage_spend").value);
  const loyalty = parseFloat(document.getElementById("loyalty_spend").value);
  const isDummy = document.getElementById("dummy_spend").checked;
  const isEvent = document.getElementById("event_spend").checked;
  const isTCOver13900 = document.getElementById("tc_price_spend").checked;
  
  // Exercise weapon skill points (same as in original function)
  const pointsMainSkillRegularWeapon = 300000;
  const pointsMainSkillDurableWeapon = pointsMainSkillRegularWeapon * 3.6;
  const pointsMainSkillLastingWeapon = pointsMainSkillRegularWeapon * 28.8;
  
  // Costs
  const costRegularK = 347.222;
  const costRegularTc = 25;
  const costDurableK = 1250;
  const costDurableTc = 90;
  const costLastingK = 10000;
  const costLastingTc = 720;
  
  // Determine weapon type and points
  let weaponPoints, weaponCostK, weaponCostTc, weaponTime;
  if (weaponType === "Regular") {
    weaponPoints = pointsMainSkillRegularWeapon;
    weaponCostK = costRegularK;
    weaponCostTc = costRegularTc;
    weaponTime = weaponCount / 3.6; // hours
  } else if (weaponType === "Durable") {
    weaponPoints = pointsMainSkillDurableWeapon;
    weaponCostK = costDurableK;
    weaponCostTc = costDurableTc;
    weaponTime = weaponCount; // hours
  } else if (weaponType === "Lasting") {
    weaponPoints = pointsMainSkillLastingWeapon;
    weaponCostK = costLastingK;
    weaponCostTc = costLastingTc;
    weaponTime = weaponCount * 8; // hours
  }
  
  // Calculate total points gained (with loyalty bonus)
  let totalPointsGained = weaponCount * weaponPoints * (1 + (loyalty / 100));
  
  // Apply modifiers (reverse of the original calculation)
  if (isEvent) {
    totalPointsGained = totalPointsGained * 2; // Double event doubles the points
  }
  if (isDummy) {
    totalPointsGained = totalPointsGained * 1.1; // Private dummy gives 10% bonus
  }
  
  // Determine vocation constant
  let vocationConstant = 1.1;
  if (vocationAndType === "Paladin Magic") {
    vocationConstant = 1.4;
  } else if (vocationAndType === "Monk Magic") {
    vocationConstant = 1.25;
  }
  
  // Calculate current skill total points
  const currentSkillTotalPoints = total_skill_points_at_given_level(1600, vocationConstant, Math.floor(currentSkill) + 1, 0);
  const pointsToNextSkill = points_to_next_skill_level(1600, vocationConstant, Math.floor(currentSkill), 0) * (currentSkillPercentage / 100);
  const currentSkillEffectivePoints = currentSkillTotalPoints - pointsToNextSkill;
  
  // Calculate new total points after using weapons
  const newTotalPoints = currentSkillEffectivePoints + totalPointsGained;
  
  // Find the skill level that corresponds to these total points
  const newSkillLevel = find_skill_level_from_points(1600, vocationConstant, newTotalPoints);
  
  // Calculate costs
  let costK = weaponCount * weaponCostK;
  let costTc = weaponCount * weaponCostTc;
  let costUnit = "k";
  
  if (Math.round(costK) > 1000) {
    costK = costK / 1000;
    costUnit = "kk";
    costK = Math.round(costK * 100) / 100;
  }
  
  // Format time
  let timeDisplay;
  if (weaponType === "Regular") {
    const hours = Math.floor(weaponTime);
    const minutes = Math.round((weaponTime % 1) * 60);
    timeDisplay = hours + " hours and " + minutes + " minutes";
  } else {
    timeDisplay = Math.round(weaponTime) + " hours";
  }
  
  // Calculate precise current skill level
  const preciseCurrentSkill = Math.floor(currentSkill) + ((100 - currentSkillPercentage) / 100);
  
  // Display results
  const exerciseFormResults = document.getElementById("exerciseformresults_spend");
  const skillGain = newSkillLevel - preciseCurrentSkill;
  
  if (isTCOver13900) {
    exerciseFormResults.innerHTML = "Using " + weaponCount + " " + weaponType.toLowerCase() + " exercise weapons will give you:<br><br><b>" +
      skillGain.toFixed(2) + " skill levels</b><br><br>" +
      "You will go from skill " + preciseCurrentSkill.toFixed(2) + " to approximately skill " + newSkillLevel.toFixed(2) + "<br><br>" +
      "Cost: " + costK + " " + costUnit + "<br>" +
      "Time required: " + timeDisplay;
  } else {
    exerciseFormResults.innerHTML = "Using " + weaponCount + " " + weaponType.toLowerCase() + " exercise weapons will give you:<br><br><b>" +
      skillGain.toFixed(2) + " skill levels</b><br><br>" +
      "You will go from skill " + preciseCurrentSkill.toFixed(2) + " to approximately skill " + newSkillLevel.toFixed(2) + "<br><br>" +
      "Cost: " + costTc + " Tibia Coins<br>" +
      "Time required: " + timeDisplay;
  }
}

function find_skill_level_from_points(skill_constant, vocation_constant, total_points) {
  // This function finds the skill level that corresponds to a given total points
  // We need to solve for skill in the equation: total_points = skill_constant * ((vocation_constant^skill - 1) / (vocation_constant - 1))
  
  // Rearranging: vocation_constant^skill = (total_points * (vocation_constant - 1) / skill_constant) + 1
  // Then: skill = log_vocation_constant((total_points * (vocation_constant - 1) / skill_constant) + 1)
  
  const logBase = (total_points * (vocation_constant - 1) / skill_constant) + 1;
  const skill = Math.log(logBase) / Math.log(vocation_constant);
  
  return skill;
}