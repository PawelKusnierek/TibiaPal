var major_charm_state_dict = {
    "low_blow": 0,
    "savage_blow": 0,
    "overpower": 0,
    "overflux": 0,
    "carnage": 0,
    "parry": 0,
    "dodge": 0,
    "wound": 0,
    "poison": 0,
    "freeze": 0,
    "zap": 0,
    "curse": 0,
    "enflame": 0,
    "divine_wrath": 0,
}

var charm_description_dict = {
    "low_blow": 'Adds 4/8/9% critical hit chance to attacks with Critical Hit weapons.',
    "savage_blow": 'Adds 20/40/44% critical extra damage to attacks with Critical Hit weapons.',
    "overpower": 'Your attacks have a 5/10/11% chance to deal damage equal to 5% of your maximum health.',
    "overflux": 'Your attacks have a 5/10/11% chance to deal damage equal to 2.5% of your maximum mana.',
    "carnage": 'Killing a monster has 10/20/22% chance to deal 15% of its max health as Physical Damage to nearby monsters.',
    "parry": 'Any damage taken is reflected to the aggressor with a certain chance (5/10/11%).',
    "dodge": 'Dodges an attack with a certain chance (5/10/11%) without taking any damage at all.',
    "wound": 'Chance (5/10/11%) to deal 5% of the creatures maximum hit points as Physical Damage.',
    "poison": 'Chance (5/10/11%) to deal 5% of the creatures maximum hit points as Earth Damage.',
    "freeze": 'Chance (5/10/11%) to deal 5% of the creatures maximum hit points as Ice Damage.',
    "zap": 'Chance (5/10/11%) to deal 5% of the creatures maximum hit points as Energy Damage.',
    "curse": 'Chance (5/10/11%) to deal 5% of the creatures maximum hit points as Death Damage.',
    "enflame": 'Chance (5/10/11%) to deal 5% of the creatures maximum hit points as Fire Damage.',
    "divine_wrath": 'Chance (5/10/11%) to deal 5% of the creatures maximum hit points as Holy Damage.',
    "fatal_hold": 'Your attacks have a 30/45/60% chance to prevent creatures from fleeing for 30 seconds.',
    "void_inversion": '20/30/40% chance to gain mana instead of losing it when taking mana drain damage.',
    "vampiric_embrace": 'Adds 1.6/2.4/3.2% Life Leech to attacks if wearing equipment that provides life leech.',
    "voids_call": 'Adds 0.8/1.2/1.6% Mana Leech to attacks if wearing equipment that provides mana leech.',
    "gut": 'The creature yields 6/9/12% more creature products.',
    "scavenge": 'Enhances your chances (+60/90/120%) to successfully skin/dust a skinnable/dustable creature.',
    "adrenaline_burst": 'After you get hit, has a certain chance (6/9/12%) to move faster for 10 seconds.',
    "cleanse": 'Removes one negative status effect when hit (6/9/12% chance) and makes you temporarily immune to it.',
    "cripple": 'Cripples the creature with a certain chance (6/9/12%) and paralyses it for 10 seconds.',
    "numb": 'Numbs the creature with a certain chance (6/9/12%) after its attack and paralyses it for 10 seconds.',
    "bless": 'Blesses you and reduces skill and xp loss by 6/9/12% when killed by the chosen creature.',
}

var minor_charm_state_dict = {
    "fatal_hold": 0,
    "void_inversion": 0,
    "vampiric_embrace": 0,
    "voids_call": 0,
    "gut": 0,
    "scavenge": 0,
    "adrenaline_burst": 0,
    "cleanse": 0,
    "cripple": 0,
    "numb": 0,
    "bless": 0,
}

var major_charms_costs = {
    "low_blow": [800, 1200, 4000],
    "savage_blow": [800, 1200, 4000],
    "overpower": [600, 900, 3000],
    "overflux": [600, 900, 3000],
    "carnage": [600, 900, 3000],
    "parry": [400, 600, 2000],
    "dodge": [240, 360, 1200],
    "wound": [240, 360, 1200],
    "poison": [240, 360, 1200],
    "freeze": [320, 480, 1600],
    "zap": [320, 480, 1600],
    "curse": [360, 540, 1800],
    "enflame": [400, 600, 2000],
    "divine_wrath": [600, 900, 3000],
}

var minor_charms_costs = {
    1: 100,
    2: 150,
    3: 225
}

var minor_echoes_gain = {
    1: 50,
    2: 100,
    3: 200
}

var total_major_charm_points = 0
var total_minor_charm_points = 0
var total_minor_charm_points_available = 100

function charm_pressed(charm_name) {
    if (charm_name in major_charm_state_dict) {
        var max_charm_points = document.getElementById('max_charm_points').value
        console.log(max_charm_points)
        if (max_charm_points > 0) {
            if ((total_major_charm_points + major_charms_costs[charm_name][major_charm_state_dict[charm_name]]) > max_charm_points) {
                var missing_points = total_major_charm_points + major_charms_costs[charm_name][major_charm_state_dict[charm_name]] - max_charm_points
                var error_message_div = document.getElementById('error_message')
                error_message_div.innerHTML = 'Error Message: ' + '<span style="color: red">Not enough Major charm points. You need ' + missing_points + ' more charm points.'
            }
            else {
                if (major_charm_state_dict[charm_name] < 3) {
                    total_major_charm_points += major_charms_costs[charm_name][major_charm_state_dict[charm_name]]

                    major_charm_state_dict[charm_name] += 1

                    total_minor_charm_points_available += minor_echoes_gain[major_charm_state_dict[charm_name]]

                    update_html_after_change(charm_name, true)

                }
            }
        }
        else {
            if (major_charm_state_dict[charm_name] < 3) {
                total_major_charm_points += major_charms_costs[charm_name][major_charm_state_dict[charm_name]]

                major_charm_state_dict[charm_name] += 1

                total_minor_charm_points_available += minor_echoes_gain[major_charm_state_dict[charm_name]]

                update_html_after_change(charm_name, true)

            }
        }
    }
    else if (charm_name in minor_charm_state_dict) {
        if (minor_charm_state_dict[charm_name] < 3) {
            if (total_minor_charm_points_available < minor_charms_costs[minor_charm_state_dict[charm_name] + 1]) {
                var missing_points = minor_charms_costs[minor_charm_state_dict[charm_name] + 1] - total_minor_charm_points_available
                var error_message_div = document.getElementById('error_message')
                error_message_div.innerHTML = 'Error Message: ' + '<span style="color: red">Not enough Minor charm points (echoes). You need ' + missing_points + ' more minor charm points.'
            }
            else {
                minor_charm_state_dict[charm_name] += 1
                total_minor_charm_points_available -= minor_charms_costs[minor_charm_state_dict[charm_name]]
                total_minor_charm_points += minor_charms_costs[minor_charm_state_dict[charm_name]]
                update_html_after_change(charm_name, false)
            }
        }
    }
}

function charm_unpressed(charm_name) {
    if (charm_name in major_charm_state_dict) {
        if (major_charm_state_dict[charm_name] > 0) {
            if ((total_minor_charm_points_available - minor_echoes_gain[major_charm_state_dict[charm_name]]) < 0) {
                var error_message_div = document.getElementById('error_message')
                error_message_div.innerHTML = 'Error Message: ' + '<span style="color: red">Unassign a Minor charm first, otherwise would result in negative minor points.'
            }
            else {
                total_minor_charm_points_available -= minor_echoes_gain[major_charm_state_dict[charm_name]]
                major_charm_state_dict[charm_name] -= 1
                total_major_charm_points -= major_charms_costs[charm_name][major_charm_state_dict[charm_name]]
                update_html_after_change(charm_name, true)
            }
        }
    }
    else if (charm_name in minor_charm_state_dict) {
        if (minor_charm_state_dict[charm_name] > 0) {
            total_minor_charm_points_available += minor_charms_costs[minor_charm_state_dict[charm_name]]
            total_minor_charm_points -= minor_charms_costs[minor_charm_state_dict[charm_name]]
            minor_charm_state_dict[charm_name] -= 1
            update_html_after_change(charm_name, false)
        }
    }
}

function update_html_after_change(charm_name, major) {
    var charm_stage_div = document.getElementById(charm_name + '_stage')
    if (major) {
        charm_stage_div.innerHTML = 'Stage: ' + major_charm_state_dict[charm_name]
    }
    else {
        charm_stage_div.innerHTML = 'Stage: ' + minor_charm_state_dict[charm_name]
    }

    var charm_planner_summary_total = document.getElementById('charm_planner_summary_total')
    var charm_planner_summary_total_echoes = document.getElementById('charm_planner_summary_total_echoes')
    var charm_planner_summary_total_echoes_leftover = document.getElementById('charm_planner_summary_total_echoes_leftover')

    charm_planner_summary_total.innerHTML = 'Total <b>Major</b> charm points used: <b>' + total_major_charm_points + '</b>'
    charm_planner_summary_total_echoes.innerHTML = 'Total <b>Minor</b> charm points used: <b>' + total_minor_charm_points + '</b>'
    charm_planner_summary_total_echoes_leftover.innerHTML = 'Total <b>Minor</b> charm points available: <b>' + total_minor_charm_points_available + '</b>'

    var error_message_div = document.getElementById('error_message')
    error_message_div.innerHTML = 'Error Message: '

    var assigned_majors = document.getElementById('assigned_majors')
    var assigned_minors = document.getElementById('assigned_minors')

    assigned_majors.innerHTML = 'Assigned <b>Major</b> charms: '
    assigned_minors.innerHTML = 'Assigned <b>Minor</b> charms: '

    var has_major_charm = false
    for (charm in major_charm_state_dict) {
        if (major_charm_state_dict[charm] > 0) {
            has_major_charm = true
            var humanized_charm = humanize(charm)
            assigned_majors.innerHTML += '<span style="color: orange">T' + major_charm_state_dict[charm] + ' ' + humanized_charm + ', '
        }
    }
    if (has_major_charm) {
        assigned_majors.innerHTML = assigned_majors.innerHTML.slice(0, -9)
    }

    var has_minor_charm = false
    for (charm in minor_charm_state_dict) {
        if (minor_charm_state_dict[charm] > 0) {
            has_minor_charm = true
            var humanized_charm = humanize(charm)
            assigned_minors.innerHTML += '<span style="color: violet">T' + minor_charm_state_dict[charm] + ' ' + humanized_charm + ', '
        }
    }
    if (has_minor_charm) {
        assigned_minors.innerHTML = assigned_minors.innerHTML.slice(0, -9)
    }

}

function humanize(string) {
    string = string.replace('_', ' ')
    return string[0].toUpperCase() + string.slice(1);
}

function reset_charms() {
    var charm_stage_div
    for (charm in major_charm_state_dict) {
        major_charm_state_dict[charm] = 0
        charm_stage_div = document.getElementById(charm + '_stage')
        charm_stage_div.innerHTML = 'Stage: 0'
    }
    for (charm in minor_charm_state_dict) {
        minor_charm_state_dict[charm] = 0
        charm_stage_div = document.getElementById(charm + '_stage')
        charm_stage_div.innerHTML = 'Stage: 0'
    }

    total_major_charm_points = 0
    total_minor_charm_points = 0
    total_minor_charm_points_available = 100

    var charm_planner_summary_total = document.getElementById('charm_planner_summary_total')
    var charm_planner_summary_total_echoes = document.getElementById('charm_planner_summary_total_echoes')
    var charm_planner_summary_total_echoes_leftover = document.getElementById('charm_planner_summary_total_echoes_leftover')

    charm_planner_summary_total.innerHTML = 'Total <b>Major</b> charm points used: <b>' + total_major_charm_points + '</b>'
    charm_planner_summary_total_echoes.innerHTML = 'Total <b>Minor</b> charm points used: <b>' + total_minor_charm_points + '</b>'
    charm_planner_summary_total_echoes_leftover.innerHTML = 'Total <b>Minor</b> charm points available: <b>' + total_minor_charm_points_available + '</b>'

    var error_message_div = document.getElementById('error_message')
    error_message_div.innerHTML = 'Error Message: '

    var assigned_majors = document.getElementById('assigned_majors')
    var assigned_minors = document.getElementById('assigned_minors')

    assigned_majors.innerHTML = 'Assigned <b>Major</b> charms: '
    assigned_minors.innerHTML = 'Assigned <b>Minor</b> charms: '

    var charm_description = document.getElementById('charm_description')
    charm_description.innerHTML = 'Charm Description: '
}

function description_on_hover(charm_name) {
    var charm_description = document.getElementById('charm_description')
    charm_description.innerHTML = 'Charm Description: <span style="color: gold">' + humanize(charm_name) + ' - ' + charm_description_dict[charm_name]
}