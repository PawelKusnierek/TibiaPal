function submit_charms_type() {
    charm_type = document.getElementById("charms").value
    health_mana_value_label = document.getElementById("health_mana_value_label")

    if (charm_type.includes("Overpower")) {
        health_mana_value_label.innerHTML = "Your maximum Health:"
    }
    else if (charm_type.includes("Overflux")) {
        health_mana_value_label.innerHTML = "Your maximum Mana:"
    }
    document.getElementById("charm_form_values").style.display = "inline-block"
    document.getElementById("charm_form_values").style.textAlign = "left"
}

function submit_charms_calculator_values() {
    charm_type = document.getElementById("charms").value
    player_resource_value = document.getElementById("health_mana_value").value
    monster_health = document.getElementById("monster_health_value").value
    monster_resistance = document.getElementById("monster_resistance").value
    monster_resistance = monster_resistance.replace("%", "")

    charm_results = document.getElementById("charm_results")
    charm_results.style.display = "initial"

    monster_damage_cap = Math.round(monster_health * 0.08)

    if (charm_type.includes("Overpower")) {
        resource_based_charm_damage = Math.round(player_resource_value * 0.05)
        if (resource_based_charm_damage < monster_damage_cap) {
            charm_results.innerHTML = "<p> Overpower damage: " + resource_based_charm_damage
        }
        else {
            charm_results.innerHTML = "<p> Overpower damage: " + monster_damage_cap + " (capped at 8% max monster health)"
        }
    }
    else {
        resource_based_charm_damage = Math.round(player_resource_value * 0.025)
        if (resource_based_charm_damage < monster_damage_cap) {
            charm_results.innerHTML = "<p> Overflux damage: " + resource_based_charm_damage
        }
        else {
            charm_results.innerHTML = "<p> Overflux damage: " + monster_damage_cap + " (capped at 8% max monster health)"
        }
    }

    elemental_damage = Math.round(monster_health * 0.05 * (monster_resistance / 100))
    charm_results.innerHTML += "Elemental Charm damage: " + elemental_damage + "</p>"
}
