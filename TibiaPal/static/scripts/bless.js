function submit_form() {
    level = document.getElementById("level").value
    content = document.getElementById("deathblessresults")
    content.innerHTML = "";

    if (level < 121) {
        regular_cost = regular_level_under_120(level)
        enhanced = enhanced_level_under_120(level)
    }
    else {
        regular_cost = regular_level_over_120(level)
        enhanced = enhanced_level_over_120(level)
    }

    total_cost = Math.round((regular_cost + enhanced) / 1000)

    content.innerHTML = content.innerHTML + "For a character with level " + level + ", blesses bought from Henricus (inq) plus two Enhanced blessings will cost:<br><br> <b>" + total_cost + "k</b>"
}

function regular_level_under_120(level) {
    return (1000 * (level - 20)) * 1.1
}

function enhanced_level_under_120(level) {
    return 520 * (level - 20)
}

function regular_level_over_120(level) {
    return (100000 + 375 * (level - 120)) * 1.1
}

function enhanced_level_over_120(level) {
    return 52000 + 200 * (level - 120)
}