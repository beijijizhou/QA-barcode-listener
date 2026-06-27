import { getUsersByDepartment } from "../db/barcodeRepo";

export async function renderHotstampDropdown(badge) {
    const workers =
        await getUsersByDepartment("烫印");

    const options = workers
        .map(worker => `
            <option value="${worker.name}">
                ${worker.name}
            </option>
        `)
        .join("");

    const wrapper = document.createElement("div");
    wrapper.style.marginTop = "8px";

    wrapper.innerHTML = `
        <label>烫印人员：</label>

        <select id="qa-hotstamp-user">
            <option value="">请选择</option>
            ${options}
        </select>
    `;

    badge.appendChild(wrapper);

    wrapper
        .querySelector("#qa-hotstamp-user")
        .onchange = (e) => {
            console.log(
                "Selected:",
                e.target.value
            );
        };
}