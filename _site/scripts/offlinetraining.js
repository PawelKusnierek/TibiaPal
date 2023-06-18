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
    else {
        total_hours = Math.round(calculate_paladin_skill(currentskill, currentskillpercentage, targetskill, loyalty))
        skill_type = "distance"
    }

    if (type_of_training == 'Online') {
        total_hours = total_hours / 2
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