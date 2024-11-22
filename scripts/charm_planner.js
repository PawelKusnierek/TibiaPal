var major_charm_state_dict = {
    "wound": 0,
    "poison": 0,
}

var minor_charm_state_dict = {
    "adrenaline_burst": 0,
}

var major_charms_costs = {
    "wound": [240, 360, 1200],
    "poison": [240, 360, 1200],
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


var charm_planner_summary_total_echoes = document.getElementById('charm_planner_summary_total_echoes')


function charm_pressed(charm_name) {
    if (charm_name in major_charm_state_dict) {
        if (major_charm_state_dict[charm_name] < 3) {
            total_major_charm_points += major_charms_costs[charm_name][major_charm_state_dict[charm_name]]
            
            major_charm_state_dict[charm_name] += 1
            
            total_minor_charm_points_available += minor_echoes_gain[major_charm_state_dict[charm_name]]
            
            update_html_after_change(charm_name)
            
        }
    }
    else if (charm_name in minor_charm_state_dict) {
        console.log('minor')
    }
}

function charm_unpressed(charm_name) {
    if (charm_name in major_charm_state_dict) {
        if (major_charm_state_dict[charm_name] > 0) {
            total_minor_charm_points_available -= minor_echoes_gain[major_charm_state_dict[charm_name]]
            major_charm_state_dict[charm_name] -= 1
            total_major_charm_points -= major_charms_costs[charm_name][major_charm_state_dict[charm_name]]
            
            
            
            
            
            update_html_after_change(charm_name)
            
        }
    }
}

function update_html_after_change(charm_name) {
    var charm_stage_div = document.getElementById(charm_name + '_stage')
    charm_stage_div.innerHTML = 'Stage: ' + major_charm_state_dict[charm_name]

    var charm_planner_summary_total = document.getElementById('charm_planner_summary_total')
    var charm_planner_summary_total_echoes_leftover = document.getElementById('charm_planner_summary_total_echoes_leftover')

    charm_planner_summary_total.innerHTML = 'Total Major charm points required: ' + total_major_charm_points
    charm_planner_summary_total_echoes_leftover.innerHTML = 'Total Minor charm points (echoes) still available: ' + total_minor_charm_points_available
}