function submit_form() {
    level = document.getElementById("level").value
    content = document.getElementById("deathblessresults")
    content.innerHTML = "";

    IsHenricus = document.getElementById("henricus").checked;
    IsEnhanced = document.getElementById("enhanced").checked;
    IsTwist = document.getElementById("twist").checked;

    regular_cost = Math.round(regular_blesses(level, IsHenricus) / 1000)

    if (IsEnhanced) {
        enhanced_cost = Math.round(enhanced_blesses(level) / 1000)
    }
    else {
        enhanced_cost = 0
    }

    if (IsTwist) {
        if (level > 270) {
            twist_cost = 50000 / 1000
        }
        else {
            twist_cost = Math.round((2000 + 200 * (level - 30)) / 1000)
        }
    }
    else {
        twist_cost = 0
    }

    total_cost = Math.round(regular_cost + enhanced_cost + twist_cost)

    content.innerHTML = content.innerHTML + "For a character with level " + level + ", total bless cost: <b>" + total_cost + "k</b> <br><br> Regular Bless: " + regular_cost + "k<br>Enhanced Bless: " + enhanced_cost + "k<br> Twist of Fate: " + twist_cost + "k"
}

function regular_blesses(level, IsHenricus) {
    if (level < 121) {
        if (IsHenricus) {
            return (1000 * (level - 20)) * 1.1
        }
        else {
            return 1000 * (level - 20)
        }
    }
    else {
        if (IsHenricus) {
            return (100000 + 375 * (level - 120)) * 1.1
        }
        else {
            return 100000 + 375 * (level - 120)
        }
    }
}

function enhanced_blesses(level) {
    if (level < 121) {
        return 520 * (level - 20)
    }
    else {
        return 52000 + 200 * (level - 120)
    }
}