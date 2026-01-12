var item_classification
var target_tier
var target_price
var feeder_price
var exalted_price

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

// Tier limits based on classification
var tier_limits = {
  1: 1,
  2: 2,
  3: 3,
  4: 10
}

// Initialize form when page loads
document.addEventListener('DOMContentLoaded', function() {
  initialize_forge_form()
})

// Initialize the forge form
function initialize_forge_form() {
  const classificationSelect = document.getElementById('classification')
  const targetTierSelect = document.getElementById('target_tier')
  
  // Add event listener for classification changes
  classificationSelect.addEventListener('change', function() {
    update_target_tier_options()
  })
  
  // Initialize target tier as disabled
  update_target_tier_options()
}

// Update target tier options based on selected classification
function update_target_tier_options() {
  const classificationSelect = document.getElementById('classification')
  const targetTierSelect = document.getElementById('target_tier')
  const selectedClassification = classificationSelect.value
  
  // Clear existing options
  targetTierSelect.innerHTML = ''
  
  if (!selectedClassification || selectedClassification === '') {
    // No classification selected - disable tier select
    targetTierSelect.disabled = true
    const placeholderOption = document.createElement('option')
    placeholderOption.value = ''
    placeholderOption.textContent = '--'
    targetTierSelect.appendChild(placeholderOption)
  } else {
    // Classification selected - enable tier select and populate options
    targetTierSelect.disabled = false
    const maxTier = tier_limits[selectedClassification]
    
    // Add placeholder option
    const placeholderOption = document.createElement('option')
    placeholderOption.value = ''
    placeholderOption.textContent = '--'
    targetTierSelect.appendChild(placeholderOption)
    
    // Add tier options up to the maximum allowed
    for (let i = 1; i <= maxTier; i++) {
      const option = document.createElement('option')
      option.value = i
      option.textContent = i
      targetTierSelect.appendChild(option)
    }
  }
}

function submit_forge_form() {
  read_form_values()
  var verified = verify_entered_values()
  if (verified == false) {
    // Clear results if verification fails
    clear_forge_results()
    return
  }
  calculate_fusion()
  if (item_classification == 4) {
    calculate_convergence_fusion()
  }
}

function read_form_values() {
  item_classification = document.getElementById("classification").value
  target_tier = document.getElementById("target_tier").value
  target_price = document.getElementById("main_item_price").value
  feeder_price = document.getElementById("feeder_item_price").value
  exalted_price = document.getElementById("exalted_core_price").value
}

function verify_entered_values() {
  var missingFields = []
  
  // Check each required field
  if (!item_classification || item_classification === '') {
    missingFields.push("Item Classification")
  }
  if (!target_tier || target_tier === '') {
    missingFields.push("Target Tier")
  }
  if (!target_price || target_price === '') {
    missingFields.push("Target Item Price")
  }
  if (!feeder_price || feeder_price === '') {
    missingFields.push("Feeder Item Price")
  }
  if (!exalted_price || exalted_price === '') {
    missingFields.push("Exalted Core Price")
  }
  // Check for sliver_price only if the field exists
  const sliverInput = document.getElementById("sliver_price")
  if (sliverInput && (!sliver_price || sliver_price === '')) {
    missingFields.push("Sliver Price")
  }
  
  // If any fields are missing, show a single warning with all missing fields
  if (missingFields.length > 0) {
    var message = "Please fill in all required fields before calculations can take place.\n\nMissing fields:\n"
    missingFields.forEach(function(field) {
      message += "• " + field + "\n"
    })
    window.alert(message)
    return false
  }
  
  // Convert to numbers for comparison
  item_classification = parseInt(item_classification)
  target_tier = parseInt(target_tier)
  
  // Verify tier is within limits (shouldn't happen with UI restrictions, but double-check)
  const maxTier = tier_limits[item_classification]
  if (target_tier > maxTier) {
    window.alert("Tier cannot be greater than " + maxTier + " for Item Classification " + item_classification + ".");
    return false
  }
  
  return true
}

// Format large numbers for display (convert to kk/k format)
function format_gold(amount) {
  if (amount === 0) return '0'
  if (amount >= 1000000) {
    // Convert to kk (millions)
    var kk = amount / 1000000
    if (kk >= 1000) {
      // For very large numbers, show with 2 decimal places
      return kk.toFixed(2) + ' kk'
    } else {
      // For smaller kk values, show with 1 decimal place
      return kk.toFixed(1) + ' kk'
    }
  } else if (amount >= 1000) {
    // Convert to k (thousands)
    var k = amount / 1000
    return k.toFixed(1) + ' k'
  } else {
    return Math.round(amount).toLocaleString()
  }
}

// Format number with commas
function format_number(num) {
  if (num === 0) return '0'
  if (num < 1000) {
    return Math.round(num).toString()
  }
  // For larger numbers, show with 1-2 decimal places
  if (num < 1000000) {
    return num.toFixed(1).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  } else {
    return num.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  }
}

// Format decimal number with 2 decimal places (for items consumed, exalted cores, etc.)
function format_decimal(num) {
  if (num === 0) return '0.00'
  return num.toFixed(2)
}

// Clear forge results
function clear_forge_results() {
  var resultsDiv = document.getElementById('forge_results')
  if (resultsDiv) {
    resultsDiv.innerHTML = ''
  }
}

// Helper function to calculate fusion for a single tier step
// Returns: { total_cost, attempts_needed, total_exalted_cores, feeder_items_consumed }
function calculate_single_tier_fusion(feeder_price_gold, fusion_tier, exalted_price_gold) {
  // Get fusion cost for the tier
  var fusion_cost_gold = fusion_cost[item_classification][fusion_tier]
  
  // Special events: 1% chance gold refund, 1% chance item kept
  var gold_refund_chance = 0.01
  var item_kept_chance = 0.01
  
  // Expected fusion cost per attempt (1% chance of refund)
  // Fusion cost is refunded 1% of the time, but exalted cores are still paid
  var expected_fusion_cost_per_attempt = fusion_cost_gold * (1 - gold_refund_chance)
  var cost_per_attempt = expected_fusion_cost_per_attempt + (2 * exalted_price_gold)
  
  // Fusion probabilities
  var success_rate = 0.65
  var failure_rate = 0.35
  var tier_loss_on_failure = 0.50  // 50% chance of tier loss on failure
  
  // Expected outcomes per attempt:
  // Success (65%): Get 1 next tier, lose 2 feeder items (or 1 if item kept event)
  // Failure (35%): 
  //   - 50% chance: lose 1 feeder item (tier loss) (or 0 if item kept event)
  //   - 50% chance: lose 0 feeder items (no tier loss)
  
  // Expected next tier items produced per attempt
  var expected_output_per_attempt = success_rate * 1
  
  // Expected feeder items consumed per attempt (accounting for 1% item kept chance)
  // Success case: 99% lose 2, 1% lose 1 (keep one back)
  var success_item_loss = success_rate * ((1 - item_kept_chance) * 2 + item_kept_chance * 1)
  
  // Failure with tier loss: 99% lose 1, 1% lose 0 (keep the item)
  var failure_tier_loss_item_loss = failure_rate * tier_loss_on_failure * ((1 - item_kept_chance) * 1 + item_kept_chance * 0)
  
  // Failure without tier loss: always lose 0
  var failure_no_tier_loss_item_loss = failure_rate * (1 - tier_loss_on_failure) * 0
  
  var expected_feeder_per_attempt = success_item_loss + failure_tier_loss_item_loss + failure_no_tier_loss_item_loss
  
  // To get 1 output item, we need 1 / expected_output_per_attempt attempts
  var attempts_needed = 1 / expected_output_per_attempt
  
  // Total cost to get 1 output item
  var total_fusion_cost = attempts_needed * cost_per_attempt
  var total_feeder_cost = attempts_needed * expected_feeder_per_attempt * feeder_price_gold
  var total_cost = total_fusion_cost + total_feeder_cost
  
  // Total exalted cores used
  var total_exalted_cores = attempts_needed * 2
  
  return {
    total_cost: total_cost,
    attempts_needed: attempts_needed,
    total_exalted_cores: total_exalted_cores,
    feeder_items_consumed: expected_feeder_per_attempt * attempts_needed
  }
}

// Calculate fusion for T0 to target tier (T1 through T10)
function calculate_fusion() {
  // Only handle T1 through T10 cases
  if (target_tier < 1 || target_tier > 10) {
    return
  }
  
  // Convert prices from kk/k to gold
  var exalted_price_gold = parseFloat(exalted_price) * 1000   // k to gold
  var t0_price_gold = parseFloat(feeder_price) * 1000000  // kk to gold
  
  // Calculate T0 to T1 first (needed for all tiers)
  var previous_result = calculate_single_tier_fusion(t0_price_gold, 1, exalted_price_gold)
  
  // If target is T1, we're done
  if (target_tier === 1) {
    display_fusion_results(previous_result.total_cost, previous_result.attempts_needed, 
                          previous_result.total_exalted_cores, previous_result.feeder_items_consumed, target_tier)
    return
  }
  
  // For T2 and above, calculate each tier step sequentially
  var total_t0_items = previous_result.feeder_items_consumed  // T0 items for T0→T1
  var total_attempts = previous_result.attempts_needed
  var total_exalted_cores = previous_result.total_exalted_cores
  
  // Calculate each tier from T1 to target_tier
  for (var tier = 2; tier <= target_tier; tier++) {
    // Use previous tier's total cost as feeder price for current tier
    var current_feeder_price = previous_result.total_cost
    
    // Calculate current tier fusion
    var current_result = calculate_single_tier_fusion(current_feeder_price, tier, exalted_price_gold)
    
    // Accumulate totals
    // Total T0 items = current tier feeder items * accumulated T0 items from previous tiers
    total_t0_items = current_result.feeder_items_consumed * total_t0_items
    total_attempts = current_result.attempts_needed + (current_result.feeder_items_consumed * total_attempts)
    total_exalted_cores = current_result.total_exalted_cores + (current_result.feeder_items_consumed * total_exalted_cores)
    
    // Update previous_result for next iteration
    previous_result = current_result
  }
  
  // Display results
  display_fusion_results(previous_result.total_cost, total_attempts, total_exalted_cores, 
                        total_t0_items, target_tier)
}

// Display fusion calculation results
function display_fusion_results(total_cost, attempts_needed, total_exalted_cores, total_t0_items, target_tier) {
  var resultsDiv = document.getElementById('forge_results')
  if (!resultsDiv) return
  
  var title = 'Expected Fusion Results (T0 → T' + target_tier + ')'
  
  var html = '<div style="background-color: rgba(45, 140, 248, 0.1); border: 1px solid #2d8cf8b6; border-radius: 4px; padding: 15px;">'
  html += '<h2 style="color: #ebebeb; margin-top: 0;">' + title + '</h2>'
  html += '<div style="color: #ebebeb; display: flex; flex-direction: column;">'
  
  html += '<div style="display: block; margin-bottom: 12px;">'
  html += '<div style="font-weight: bold; margin-bottom: 4px;">Expected Attempts Needed:</div>'
  html += '<div style="margin-left: 20px;">' + format_decimal(attempts_needed) + '</div>'
  html += '</div>'
  
  html += '<div style="display: block; margin-bottom: 12px;">'
  html += '<div style="font-weight: bold; margin-bottom: 4px;">T0 Items Consumed:</div>'
  html += '<div style="margin-left: 20px;">' + format_decimal(total_t0_items) + '</div>'
  html += '</div>'
  
  html += '<div style="display: block; margin-bottom: 12px;">'
  html += '<div style="font-weight: bold; margin-bottom: 4px;">Exalted Cores Used:</div>'
  html += '<div style="margin-left: 20px;">' + format_decimal(total_exalted_cores) + '</div>'
  html += '</div>'
  
  html += '<div style="display: block; margin-bottom: 12px;">'
  html += '<div style="font-weight: bold; margin-bottom: 4px;">Total Cost:</div>'
  html += '<div style="margin-left: 20px;">' + format_gold(total_cost) + '</div>'
  html += '</div>'
  
  html += '</div></div>'
  
  resultsDiv.innerHTML = html
}
