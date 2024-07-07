var item_classification
var target_tier
var target_price
var feeder_price
var exalted_price
var sliver_price

var fusion_cost = {
  1: {
    1: 25000
  },
  2: {
    1: 750000,
    2: 5000000
  },
  3: {
    1: 4000000,
    2: 10000000,
    3: 20000000
  },
  4: {
    1: 8000000,
    2: 20000000,
    3: 40000000,
    4: 65000000,
    5: 100000000,
    6: 250000000,
    7: 750000000,
    8: 2500000000,
    9: 8000000000,
    10: 15000000000,
  },
}

function submit_forge_form() {
  read_form_values()
  var verified = verify_entered_values()
  if (verified == false) {
    return
  }
  calculate_fusion()
  calculate_transfer()
  if (item_classification == 4) {
    calculate_convergence_fusion()
    calculate_convergence_transfer()
  }
  else {
    pass
  }
}

function read_form_values() {
  item_classification = document.getElementById("classification").value
  target_tier = document.getElementById("target_tier").value
  target_price = document.getElementById("main_item_price").value
  feeder_price = document.getElementById("feeder_item_price").value
  exalted_price = document.getElementById("exalted_core_price").value
  sliver_price = document.getElementById("sliver_price").value
}

function verify_entered_values() {
  if (item_classification == 3 && target_tier > 3) {
    window.alert("Tier cannot be greater than 3 for Item Classification 3.");
    return false
  }
  if (item_classification == 2 && target_tier > 2) {
    window.alert("Tier cannot be greater than 2 for Item Classification 2.");
    return false
  }
  if (item_classification == 1 && target_tier > 1) {
    window.alert("Tier cannot be greater than 1 for Item Classification 1.");
    return false
  }
  if (target_price == '') {
    window.alert("Please enter Target item price.");
    return false
  }
  if (feeder_price == '') {
    window.alert("Please enter Feeder item price.");
    return false
  }
  if (exalted_price == '') {
    window.alert("Please enter Exalted Core price.");
    return false
  }
  if (sliver_price == '') {
    window.alert("Please enter Sliver price.");
    return false
  }
  return true
}

function calculate_fusion() {
  var gold_spent = 0
  var exalted_cores_used = 0
  var sliver_used = 0
  var dust_used = 0

  for (var i = 0; i <= target_tier; i++) {
    pass
  }
}