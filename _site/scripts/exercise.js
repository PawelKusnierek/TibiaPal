//Each weapon is equivalent to 300k mana points - 600 ultimate mana potions * 500 average value, and all vocs progress their main skill at the same rate with the weapons

// Above this Tibia Coin price (gp per coin), buying weapons for gold is cheaper: 12 500 000 gp / 720 TC ≈ 17 361
const TC_BREAKPOINT_LABEL = "17 400 gp";

// points: main skill points per weapon; gold / tc: price per weapon;
// hours: training time per weapon (a regular weapon lasts 1000 charges at 2 s each)
const EXERCISE_WEAPONS = {
  Regular: { name: "Regular", points: 300000, gold: 434028, tc: 25, hours: 1 / 3.6 },
  Durable: { name: "Durable", points: 300000 * 3.6, gold: 1562500, tc: 90, hours: 1 },
  Lasting: { name: "Lasting", points: 300000 * 28.8, gold: 12500000, tc: 720, hours: 8 }
};

function format_number(value) {
  return Math.round(value).toLocaleString("en-US");
}

// Tibia shorthand: 434k, 1.56kk, 125kk
function format_gold(gp) {
  if (gp >= 1000000) {
    return (Math.round(gp / 10000) / 100).toLocaleString("en-US") + "kk";
  }
  return format_number(gp / 1000) + "k";
}

function format_cost(weapon, count, useGold) {
  if (useGold) {
    return '<span title="' + format_number(weapon.gold * count) + ' gp">' + format_gold(weapon.gold * count) + "</span>";
  }
  return format_number(weapon.tc * count) + " TC";
}

function format_duration(hours) {
  const totalMinutes = Math.round(hours * 60);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  let text = h > 0 ? format_number(h) + " h" : "";
  if (m > 0 || h === 0) {
    text += (text ? " " : "") + m + " min";
  }
  if (h >= 24) {
    text += ' <span class="ex-muted">(' + (Math.round(hours / 24 * 10) / 10).toLocaleString("en-US") + " days)</span>";
  }
  return text;
}

function format_skill(skill, percentToNext) {
  return skill + ' <span class="ex-muted">(' + (Math.round(percentToNext * 10) / 10) + "% to next)</span>";
}

function selected_option_text(selectId) {
  const select = document.getElementById(selectId);
  return select.options[select.selectedIndex].text;
}

function modifier_tags(loyalty, isEvent, isDummy) {
  const tags = [];
  if (Number(loyalty) > 0) tags.push("Loyalty " + loyalty + "%");
  if (isEvent) tags.push("Double event");
  if (isDummy) tags.push("Private dummy");
  if (tags.length === 0) return "";
  return '<div class="ex-tags">' + tags.map(tag => '<span class="ex-tag">' + tag + "</span>").join("") + "</div>";
}

function currency_note(useGold) {
  return '<div class="ex-note">' + (useGold
    ? "Prices in gold, since Tibia Coins cost more than " + TC_BREAKPOINT_LABEL + " on your server."
    : "Prices in Tibia Coins, since they cost less than " + TC_BREAKPOINT_LABEL + " on your server.") + "</div>";
}

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
  else if (vocation_and_type == "Knight Magic") {
    vocation_constant = 3.0
  }


  points_required = main_skill_calculation_points_required(vocation_constant, currentskill, currentskillpercentage, targetskill, IsDummy, IsEvent, 0)

  regular_weapons_required = Math.ceil(points_required / (EXERCISE_WEAPONS.Regular.points * (1 + (loyalty / 100))))
  durable_weapons_required = Math.ceil(points_required / (EXERCISE_WEAPONS.Durable.points * (1 + (loyalty / 100))))
  lasting_weapons_required = Math.ceil(points_required / (EXERCISE_WEAPONS.Lasting.points * (1 + (loyalty / 100))))

  //filling out the html after calculation
  IsTCOverBreakpoint = document.getElementById("tc_price").checked;

  const rows = [
    [EXERCISE_WEAPONS.Lasting, lasting_weapons_required],
    [EXERCISE_WEAPONS.Durable, durable_weapons_required],
    [EXERCISE_WEAPONS.Regular, regular_weapons_required]
  ].map(([weapon, count]) =>
    "<tr>"
    + '<th scope="row">' + weapon.name + "</th>"
    + '<td class="ex-num"><b>' + format_number(count) + "</b></td>"
    + '<td class="ex-num">' + format_cost(weapon, count, IsTCOverBreakpoint) + "</td>"
    + '<td class="ex-num">' + format_duration(count * weapon.hours) + "</td>"
    + "</tr>"
  ).join("")

  exerciseformresults.innerHTML = '<div class="ex-results">'
    + '<div class="ex-summary">'
    + '<div class="ex-label">' + selected_option_text("vocation") + "</div>"
    + '<div class="ex-headline">Skill ' + format_skill(parseInt(currentskill), parseFloat(currentskillpercentage)) + ' <span class="ex-arrow">→</span> ' + parseInt(targetskill) + "</div>"
    + modifier_tags(loyalty, IsEvent, IsDummy)
    + "</div>"
    + '<p class="ex-intro">Use <b>one</b> of the following:</p>'
    + '<table class="ex-table">'
    + '<thead><tr><th scope="col">Weapon</th><th scope="col" class="ex-num">Amount</th><th scope="col" class="ex-num">Cost</th><th scope="col" class="ex-num">Training time</th></tr></thead>'
    + "<tbody>" + rows + "</tbody>"
    + "</table>"
    + currency_note(IsTCOverBreakpoint)
    + "</div>"

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
  const isTCOverBreakpoint = document.getElementById("tc_price_spend").checked;
  
  const weapon = EXERCISE_WEAPONS[weaponType];

  // Calculate total points gained (with loyalty bonus)
  let totalPointsGained = weaponCount * weapon.points * (1 + (loyalty / 100));
  
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
  } else if (vocationAndType === "Knight Magic") {
    vocationConstant = 3.0;
  }
  
  // Calculate current skill total points
  const currentSkillTotalPoints = total_skill_points_at_given_level(1600, vocationConstant, Math.floor(currentSkill) + 1, 0);
  const pointsToNextSkill = points_to_next_skill_level(1600, vocationConstant, Math.floor(currentSkill), 0) * (currentSkillPercentage / 100);
  const currentSkillEffectivePoints = currentSkillTotalPoints - pointsToNextSkill;
  
  // Calculate new total points after using weapons
  const newTotalPoints = currentSkillEffectivePoints + totalPointsGained;
  
  // Find the skill level that corresponds to these total points, and how far into it they reach
  const newSkill = Math.floor(find_skill_level_from_points(1600, vocationConstant, newTotalPoints) + 1e-9);
  const pointsInNewSkill = points_to_next_skill_level(1600, vocationConstant, newSkill, 0);
  const pointsLeftInNewSkill = total_skill_points_at_given_level(1600, vocationConstant, newSkill + 1, 0) - newTotalPoints;
  const newSkillPercentage = Math.min(100, Math.max(0, pointsLeftInNewSkill / pointsInNewSkill * 100));

  // Skill as a decimal (112.25 = skill 112 with 75% to next), the same way for both ends
  const preciseCurrentSkill = Math.floor(currentSkill) + ((100 - currentSkillPercentage) / 100);
  const preciseNewSkill = newSkill + ((100 - newSkillPercentage) / 100);
  const skillGain = preciseNewSkill - preciseCurrentSkill;

  // Display results
  const exerciseFormResults = document.getElementById("exerciseformresults_spend");

  exerciseFormResults.innerHTML = '<div class="ex-results">' +
    '<div class="ex-summary">' +
    '<div class="ex-label">' + selected_option_text("vocation_spend") + "</div>" +
    '<div class="ex-headline">+' + skillGain.toFixed(2) + " skill levels</div>" +
    '<div class="ex-subline">Skill ' + format_skill(Math.floor(currentSkill), currentSkillPercentage) +
    ' <span class="ex-arrow">→</span> ' + format_skill(newSkill, newSkillPercentage) + "</div>" +
    modifier_tags(loyalty, isEvent, isDummy) +
    "</div>" +
    '<dl class="ex-stats">' +
    "<div><dt>Weapons</dt><dd>" + format_number(weaponCount) + " " + weapon.name.toLowerCase() + "</dd></div>" +
    "<div><dt>Cost</dt><dd>" + format_cost(weapon, weaponCount, isTCOverBreakpoint) + "</dd></div>" +
    "<div><dt>Training time</dt><dd>" + format_duration(weaponCount * weapon.hours) + "</dd></div>" +
    "</dl>" +
    currency_note(isTCOverBreakpoint) +
    "</div>";
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
