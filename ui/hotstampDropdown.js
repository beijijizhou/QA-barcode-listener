import { getUsersByDepartment } from "../db/barcodeRepo";
import {
    getSharedHotstampUser,
    isHotstampUserKey,
    onSharedStateChange,
    setSharedHotstampUser
} from "../storage/sharedState";

let isListeningForSharedHotstamp = false;

function setHotstampSelectValue(value) {
    const select =
        document.getElementById("qa-hotstamp-user");

    if (select) {
        select.value = value || "";
    }

    localStorage.setItem(
        "qa_hotstamp_user",
        value || ""
    );
}

function listenForHotstampChanges() {
    if (isListeningForSharedHotstamp) return;

    onSharedStateChange((key, value) => {
        if (isHotstampUserKey(key)) {
            setHotstampSelectValue(value);
        }
    });

    isListeningForSharedHotstamp = true;
}

export async function renderHotstampDropdown(badge) {
    const workers =
        await getUsersByDepartment("烫印");

    const options = workers
        .map(worker => `
            <option
                value="${worker.name}"
                style="color:#003366;background:white;"
            >
                ${worker.name}
            </option>
        `)
        .join("");

    const wrapper = document.createElement("div");
    wrapper.style.marginTop = "8px";
    wrapper.style.color = "#003366";

    wrapper.innerHTML = `
        <label style="color:#003366;">
            烫印人员：
        </label>

        <select
            id="qa-hotstamp-user"
            style="color:#003366 !important;background:white !important;"
        >
            <option
                value=""
                style="color:#003366;background:white;"
            >
                请选择
            </option>
            ${options}
        </select>
    `;

    badge.appendChild(wrapper);

    const select =
        wrapper.querySelector("#qa-hotstamp-user");

    setHotstampSelectValue(
        await getSharedHotstampUser()
    );
    listenForHotstampChanges();

    select.onchange = async (e) => {
        setHotstampSelectValue(e.target.value);
        await setSharedHotstampUser(e.target.value);
    };
}
