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
        if (major_charm_state_dict[charm_name] < 3) {
            total_major_charm_points += major_charms_costs[charm_name][major_charm_state_dict[charm_name]]

            major_charm_state_dict[charm_name] += 1

            total_minor_charm_points_available += minor_echoes_gain[major_charm_state_dict[charm_name]]

            update_html_after_change(charm_name, true)

        }
    }
    else if (charm_name in minor_charm_state_dict) {
        if (minor_charm_state_dict[charm_name] < 3) {
            if (total_minor_charm_points_available < minor_charms_costs[minor_charm_state_dict[charm_name] + 1]) {
                var error_message_div = document.getElementById('error_message')
                error_message_div.innerHTML = 'Latest Error Message: ' + '<span style="color: red">Not enough Minor Charm Points (Echoes)'
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
                error_message_div.innerHTML = 'Latest Error Message: ' + '<span style="color: red">Unassign a minor charm first, otherwise would result in negative points.'
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

    charm_planner_summary_total.innerHTML = 'Total Major charm points required: ' + total_major_charm_points
    charm_planner_summary_total_echoes.innerHTML = 'Total Minor charm points (echoes) used: ' + total_minor_charm_points
    charm_planner_summary_total_echoes_leftover.innerHTML = 'Total Minor charm points (echoes) still available: ' + total_minor_charm_points_available

    var error_message_div = document.getElementById('error_message')
    error_message_div.innerHTML = 'Latest Error Message: '
}