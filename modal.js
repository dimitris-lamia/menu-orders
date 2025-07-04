// modal.js
// Modal logic for order details

function showOrderModal(order) {
    const modal = document.getElementById('orderModal');
    const content = document.getElementById('orderModalContent');
    let html = `<h2 style='margin-top:0;'>Order Details</h2>`;
    html += `<div><b>Table:</b> ${order.customer}</div>`;
    html += `<div><b>Time:</b> ${order.time ? new Date(order.time).toLocaleString() : ''}</div>`;
    html += `<ul style='margin-top:12px;'>`;
    order.items.forEach(item => {
        let ingHtml = '';
        if (item.defaultIngredients && item.defaultIngredients.length)
            ingHtml += item.defaultIngredients.join(', ');
        if (item.extraIngredients && item.extraIngredients.length)
            ingHtml += (ingHtml ? ', ' : '') + item.extraIngredients.join(', ');
        if ((!item.defaultIngredients || !item.defaultIngredients.length) && (!item.extraIngredients || !item.extraIngredients.length) && item.ingredients && item.ingredients.length)
            ingHtml += item.ingredients.join(', ');
        html += `<li style='margin-bottom:8px;'><b>${item.quantity} x ${item.item}</b>` + (ingHtml ? ` <span>(${ingHtml})</span>` : '') + `</li>`;
    });
    html += `</ul>`;
    // Add Clear Table button
    html += `<button id='modalClearTableBtn' class='clear-table-btn' style='margin-top:10px;'>Clear Table</button>`;
    // Add Move Table button
    html += `<button id='modalMoveTableBtn' class='move-table-btn' style='margin-top:10px;margin-left:10px;'>Move Table</button>`;
    // Add custom input for move table (hidden by default)
    html += `<div id='moveTableInputBox' style='display:none;margin-top:16px;'>
        <label for='moveTableInput' style='font-weight:bold;'>New Table #:</label>
        <input id='moveTableInput' type='number' min='1' max='200' style='font-size:1.2em;padding:4px 12px;width:90px;margin:0 10px;border:2px solid #2980b9;border-radius:8px;'>
        <button id='moveTableConfirmBtn' class='move-table-btn' style='padding:6px 18px;'>Confirm</button>
        <button id='moveTableCancelBtn' class='close-btn' style='padding:6px 18px;margin-left:8px;'>Cancel</button>
    </div>`;
    // Add Close Modal button
    html += `<button id='modalCloseBtn' class='close-btn' style='margin-top:10px;margin-left:10px;'>Close</button>`;
    content.innerHTML = html;
    modal.classList.add('active');
    // Add event for clear button
    setTimeout(() => {
        const btn = document.getElementById('modalClearTableBtn');
        if (btn) {
            btn.onclick = async () => {
                if (confirm('Clear all orders for table ' + order.customer + '?')) {
                    await fetch(`${window.location.protocol}//${window.location.host}/orders/table/${order.customer}`, { method: 'DELETE' });
                    closeOrderModal();
                    if (typeof fetchOrders === 'function') fetchOrders();
                }
            };
        }
        // Add event for move table button
        const moveBtn = document.getElementById('modalMoveTableBtn');
        const moveBox = document.getElementById('moveTableInputBox');
        const moveInput = document.getElementById('moveTableInput');
        const moveConfirm = document.getElementById('moveTableConfirmBtn');
        const moveCancel = document.getElementById('moveTableCancelBtn');
        if (moveBtn && moveBox && moveInput && moveConfirm && moveCancel) {
            moveBtn.onclick = async () => {
                let TABLE_COUNT = 40;
                if (window.menuConfig && window.menuConfig.tableCount) {
                    TABLE_COUNT = window.menuConfig.tableCount;
                } else {
                    try {
                        const res = await fetch('/menu.json');
                        const menu = await res.json();
                        if (menu.tableCount) TABLE_COUNT = menu.tableCount;
                    } catch {}
                }
                moveInput.min = 1;
                moveInput.max = TABLE_COUNT;
                moveInput.value = '';
                moveBox.style.display = '';
                moveInput.focus();
            };
            moveCancel.onclick = () => {
                moveBox.style.display = 'none';
            };
            moveConfirm.onclick = async () => {
                let newTable = parseInt(moveInput.value);
                let TABLE_COUNT = 40;
                if (window.menuConfig && window.menuConfig.tableCount) {
                    TABLE_COUNT = window.menuConfig.tableCount;
                }
                if (!newTable || isNaN(newTable) || newTable < 1 || newTable > TABLE_COUNT || newTable == order.customer) {
                    alert('Invalid table number.');
                    moveInput.focus();
                    return;
                }
                try {
                    await fetch(`${window.location.protocol}//${window.location.host}/orders/moveTable`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ fromTable: order.customer, toTable: newTable })
                    });
                    closeOrderModal();
                    if (typeof fetchOrders === 'function') fetchOrders();
                } catch (err) {
                    alert('Failed to move table orders.');
                }
            };
        }
        // Add event for close modal button
        const closeBtn = document.getElementById('modalCloseBtn');
        if (closeBtn) {
            closeBtn.onclick = closeOrderModal;
        }
    }, 0);
}
function closeOrderModal() {
    document.getElementById('orderModal').classList.remove('active');
}
document.getElementById('closeOrderModal').onclick = closeOrderModal;
document.getElementById('orderModal').onclick = function(e) {
    if (e.target === this) closeOrderModal();
};
