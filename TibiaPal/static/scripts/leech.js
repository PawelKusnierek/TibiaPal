function submit_leech() {
    leechresults = document.getElementById("leechresults")
    leechresults.innerHTML = ""
    damage_dealt = document.getElementById("damagedealt").value
    leech_percantage = document.getElementById("leechpercent").value
    monsters_hit = document.getElementById("mobshit").value

    total_leech_amount = calculate_leech(damage_dealt, leech_percantage, monsters_hit)

    leechresults.innerHTML = "Total amount leeched: " + Math.ceil(total_leech_amount) + "<br>"
}

function calculate_leech(damage_dealt, leech_percantage, monsters_hit) {
    amount = (damage_dealt * (leech_percantage / 100) * (0.1 * monsters_hit + 0.9))
    return amount
}