magic_skill_constant = 1600
melee_skill_constant = 50
distance_skill_constant = 30

melee_hits_per_hour_of_offline = 900
distance_hits_per_hour_of_offline = 720
mage_mana_per_hour_of_offline = 1800
knight_mana_per_hour_of_offline = 600
paladin_mana_per_hour_of_offline = 1200

mage_magic_constant = 1.1
knight_melee_constant = 1.1
paladin_distance_constant = 1.1

function submit_form() {
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

    offlinetrainingformresults = document.getElementById("offlinetrainingformresults")
    offlinetrainingformresults.innerHTML = ""

    type_of_training = document.getElementById("type_of_training").value
    vocation = document.getElementById("vocation").value
    currentskill = document.getElementById("currentskill").value
    currentskillpercentage = document.getElementById("currentskillpercentage").value
    targetskill = document.getElementById("targetskill").value
    loyalty = document.getElementById("loyalty").value

    if (vocation == 'Mage') {
        total_hours = Math.round(calculate_mage_skill(currentskill, currentskillpercentage, targetskill, loyalty))
        skill_type = "magic level"
    }
    else if (vocation == 'Knight') {
        total_hours = Math.round(calculate_knight_skill(currentskill, currentskillpercentage, targetskill, loyalty))
        skill_type = "melee"
    }
    else if (vocation == 'Monk') {
        total_hours = Math.round(calculate_knight_skill(currentskill, currentskillpercentage, targetskill, loyalty))
        skill_type = "fist"
    }
    else {
        total_hours = Math.round(calculate_paladin_skill(currentskill, currentskillpercentage, targetskill, loyalty))
        skill_type = "distance"
    }

    if (type_of_training == 'Online') {
        total_hours = Math.round(total_hours / 2)
        if (skill_type == 'distance') {
            total_hours = Math.round(total_hours / 2)
        }
    }

    if (type_of_training == 'Online') {
        online_hours = total_hours % 24
        online_days = (total_hours - online_hours) / 24
        online_years = 0
        online_months = 0
        if (online_days > 30) {
            left_days = online_days % 30
            online_months = (online_days - left_days) / 30
            online_days = left_days
        }
        if (online_months > 12) {
            left_months = online_months % 12
            online_years = (online_months - left_months) / 12
            online_months = left_months
        }
        offlinetrainingformresults.innerHTML = "To get from " + currentskill + " " + skill_type + " to " + targetskill + " " + skill_type + ", you need to online train for a total of " + total_hours + " hours, which at 24 hours of online training a day is: <br><br><b>" + online_years + " years, " + online_months + " months, " + online_days + " days, " + online_hours + " hours</b><br>"
    }
    else {
        offline_hours = total_hours % 12
        offline_days = (total_hours - offline_hours) / 12
        offline_years = 0
        offline_months = 0
        if (offline_days > 30) {
            left_days = offline_days % 30
            offline_months = (offline_days - left_days) / 30
            offline_days = left_days
        }
        if (offline_months > 12) {
            left_months = offline_months % 12
            offline_years = (offline_months - left_months) / 12
            offline_months = left_months
        }
        offlinetrainingformresults.innerHTML = "To get from " + currentskill + " " + skill_type + " to " + targetskill + " " + skill_type + ", you need to offline train for a total of " + total_hours + " hours, which at 12 hours of offline training a day is: <br><br><b>" + offline_years + " years, " + offline_months + " months, " + offline_days + " days, " + offline_hours + " hours</b><br>"
    }
}

function submit_form_time() {
    // Get the required field values
    const currentSkill = document.getElementById("currentskill_time").value;
    const trainingTime = document.getElementById("trainingtime_time").value;
    
    // Check if the current skill field is empty or invalid
    if (!currentSkill || currentSkill.trim() === "") {
        alert("Please enter your current skill level. You cannot proceed without specifying your current skill.");
        document.getElementById("currentskill_time").focus();
        return;
    }
    
    // Check if the training time field is empty or invalid
    if (!trainingTime || trainingTime <= 0) {
        alert("Please enter a valid training time. You cannot proceed without specifying how many hours you want to train.");
        document.getElementById("trainingtime_time").focus();
        return;
    }
    
    // Validate that the current skill value is a number
    if (isNaN(currentSkill) || currentSkill <= 0) {
        alert("Please enter a valid current skill level (must be a positive number).");
        document.getElementById("currentskill_time").focus();
        return;
    }
    
    // If validation passes, proceed with the calculation
    calculate_skill_gain_from_time();
}

function calculate_skill_gain_from_time() {
    // Get form values
    const typeOfTraining = document.getElementById("type_of_training_time").value;
    const vocation = document.getElementById("vocation_time").value;
    const currentSkill = parseFloat(document.getElementById("currentskill_time").value);
    const currentSkillPercentage = parseFloat(document.getElementById("currentskillpercentage_time").value) || 0;
    const trainingTime = parseFloat(document.getElementById("trainingtime_time").value);
    const loyalty = parseFloat(document.getElementById("loyalty_time").value) || 0;
    
    // Determine skill type and constants
    let skillConstant, vocationConstant, pointsPerHour, skillType;
    
    if (vocation === 'Mage') {
        skillConstant = magic_skill_constant;
        vocationConstant = mage_magic_constant;
        pointsPerHour = mage_mana_per_hour_of_offline;
        skillType = "magic level";
    } else if (vocation === 'Knight') {
        skillConstant = melee_skill_constant;
        vocationConstant = knight_melee_constant;
        pointsPerHour = melee_hits_per_hour_of_offline;
        skillType = "melee";
    } else if (vocation === 'Monk') {
        skillConstant = melee_skill_constant;
        vocationConstant = knight_melee_constant;
        pointsPerHour = melee_hits_per_hour_of_offline;
        skillType = "fist";
    } else { // Paladin
        skillConstant = distance_skill_constant;
        vocationConstant = paladin_distance_constant;
        pointsPerHour = distance_hits_per_hour_of_offline;
        skillType = "distance";
    }
    
    // Calculate total points gained
    let totalPointsGained = trainingTime * pointsPerHour * (1 + (loyalty / 100));
    
    // Apply online training modifiers
    if (typeOfTraining === 'Online') {
        totalPointsGained = totalPointsGained * 2; // Online training is twice as fast
        if (skillType === 'distance') {
            totalPointsGained = totalPointsGained * 2; // Distance training is twice as fast online
        }
    }
    
    // Calculate current skill total points
    let skillOffset;
    if (skillType === 'magic level') {
        skillOffset = 0; // Mage uses offset 0 for total points calculation
    } else {
        skillOffset = 10; // Knight, Paladin, Monk use offset 10
    }
    
    const currentSkillTotalPoints = total_skill_points_at_given_level(skillConstant, vocationConstant, Math.floor(currentSkill) + 1, skillOffset);
    const pointsToNextSkill = points_to_next_skill_level(skillConstant, vocationConstant, Math.floor(currentSkill), 10) * (currentSkillPercentage / 100);
    const currentSkillEffectivePoints = currentSkillTotalPoints - pointsToNextSkill;
    
    // Calculate new total points after training
    const newTotalPoints = currentSkillEffectivePoints + totalPointsGained;
    
    // Find the skill level that corresponds to these total points
    const newSkillLevel = find_skill_level_from_points(skillConstant, vocationConstant, newTotalPoints, skillOffset);
    
    // Calculate precise current skill level
    const preciseCurrentSkill = Math.floor(currentSkill) + ((100 - currentSkillPercentage) / 100);
    
    // Calculate skill gain
    const skillGain = newSkillLevel - preciseCurrentSkill;
    
    // Format time display
    let timeDisplay;
    if (typeOfTraining === 'Online') {
        const onlineHours = trainingTime % 24;
        const onlineDays = (trainingTime - onlineHours) / 24;
        let onlineYears = 0;
        let onlineMonths = 0;
        let days = onlineDays;
        
        if (days > 30) {
            const leftDays = days % 30;
            onlineMonths = (days - leftDays) / 30;
            days = leftDays;
        }
        if (onlineMonths > 12) {
            const leftMonths = onlineMonths % 12;
            onlineYears = (onlineMonths - leftMonths) / 12;
            onlineMonths = leftMonths;
        }
        timeDisplay = onlineYears + " years, " + onlineMonths + " months, " + days + " days, " + onlineHours + " hours";
    } else {
        const offlineHours = trainingTime % 12;
        const offlineDays = (trainingTime - offlineHours) / 12;
        let offlineYears = 0;
        let offlineMonths = 0;
        let days = offlineDays;
        
        if (days > 30) {
            const leftDays = days % 30;
            offlineMonths = (days - leftDays) / 30;
            days = leftDays;
        }
        if (offlineMonths > 12) {
            const leftMonths = offlineMonths % 12;
            offlineYears = (offlineMonths - leftMonths) / 12;
            offlineMonths = leftMonths;
        }
        timeDisplay = offlineYears + " years, " + offlineMonths + " months, " + days + " days, " + offlineHours + " hours";
    }
    
    // Display results
    const offlinetrainingformresults = document.getElementById("offlinetrainingformresults_time");
    offlinetrainingformresults.innerHTML = "After training for " + trainingTime + " hours (" + timeDisplay + "), you will gain:<br><br><b>" +
        skillGain.toFixed(2) + " " + skillType + " levels</b><br><br>" +
        "You will go from " + preciseCurrentSkill.toFixed(2) + " " + skillType + " to approximately " + newSkillLevel.toFixed(2) + " " + skillType;
}

function calculate_mage_skill(currentskill, currentskillpercentage, targetskill, loyalty) {
    current_skill_total_points = total_skill_points_at_given_level(magic_skill_constant, mage_magic_constant, parseInt(currentskill) + 1, 0)
    points_to_next_skill = points_to_next_skill_level(magic_skill_constant, mage_magic_constant, parseInt(currentskill), 10) * (currentskillpercentage / 100)
    target_skill_total_points = total_skill_points_at_given_level(magic_skill_constant, mage_magic_constant, targetskill, 0)

    total_points_needed_for_target = (target_skill_total_points - (current_skill_total_points - points_to_next_skill)) / (1 + (loyalty / 100))
    return total_points_needed_for_target / mage_mana_per_hour_of_offline
}

function calculate_knight_skill(currentskill, currentskillpercentage, targetskill, loyalty) {
    current_skill_total_points = total_skill_points_at_given_level(melee_skill_constant, knight_melee_constant, parseInt(currentskill) + 1, 10)
    points_to_next_skill = points_to_next_skill_level(melee_skill_constant, knight_melee_constant, parseInt(currentskill), 10) * (currentskillpercentage / 100)
    target_skill_total_points = total_skill_points_at_given_level(melee_skill_constant, knight_melee_constant, targetskill, 10)

    total_points_needed_for_target = (target_skill_total_points - (current_skill_total_points - points_to_next_skill)) / (1 + (loyalty / 100))
    return total_points_needed_for_target / melee_hits_per_hour_of_offline
}

function calculate_paladin_skill(currentskill, currentskillpercentage, targetskill, loyalty) {
    current_skill_total_points = total_skill_points_at_given_level(distance_skill_constant, paladin_distance_constant, parseInt(currentskill) + 1, 10)
    points_to_next_skill = points_to_next_skill_level(distance_skill_constant, paladin_distance_constant, parseInt(currentskill), 10) * (currentskillpercentage / 100)
    target_skill_total_points = total_skill_points_at_given_level(distance_skill_constant, paladin_distance_constant, targetskill, 10)

    total_points_needed_for_target = (target_skill_total_points - (current_skill_total_points - points_to_next_skill)) / (1 + (loyalty / 100))
    return total_points_needed_for_target / distance_hits_per_hour_of_offline
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

function find_skill_level_from_points(skill_constant, vocation_constant, total_points, skill_offset) {
    // This function finds the skill level that corresponds to a given total points
    // We need to solve for skill in the equation: total_points = skill_constant * ((vocation_constant^(skill - skill_offset) - 1) / (vocation_constant - 1))
    
    // Rearranging: vocation_constant^(skill - skill_offset) = (total_points * (vocation_constant - 1) / skill_constant) + 1
    // Then: skill - skill_offset = log_vocation_constant((total_points * (vocation_constant - 1) / skill_constant) + 1)
    // Finally: skill = log_vocation_constant((total_points * (vocation_constant - 1) / skill_constant) + 1) + skill_offset
    
    const logBase = (total_points * (vocation_constant - 1) / skill_constant) + 1;
    const skill = Math.log(logBase) / Math.log(vocation_constant) + skill_offset;
    
    return skill;
}