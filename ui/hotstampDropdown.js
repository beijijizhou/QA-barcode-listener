import { getUsersByDepartment } from "../db/barcodeRepo";

const HOTSTAMP_USER_KEY = "qa_hotstamp_user";
let isListeningForHotstampChanges = false;

function shareHotstampUser(name) {
    chrome.storage?.local?.set({
        [HOTSTAMP_USER_KEY]: name
    });
}

function loadSharedHotstampUser() {
    return new Promise(resolve => {
        if (!chrome.storage?.local) {
            resolve(
                localStorage.getItem(HOTSTAMP_USER_KEY) || ""
            );
            return;
        }

        chrome.storage.local.get(
            HOTSTAMP_USER_KEY,
            result => resolve(
                result[HOTSTAMP_USER_KEY] ||
                localStorage.getItem(HOTSTAMP_USER_KEY) ||
                ""
            )
        );
    });
}

function setHotstampSelectValue(value) {
    const select =
        document.getElementById("qa-hotstamp-user");

    if (select) {
        select.value = value || "";
    }

    localStorage.setItem(
        HOTSTAMP_USER_KEY,
        value || ""
    );
}

function listenForHotstampChanges() {
    if (isListeningForHotstampChanges) return;

    chrome.storage?.onChanged?.addListener((changes, areaName) => {
        const changedUser = changes[HOTSTAMP_USER_KEY];

        if (areaName === "local" && changedUser) {
            setHotstampSelectValue(changedUser.newValue);
        }
    });

    isListeningForHotstampChanges = true;
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
        await loadSharedHotstampUser()
    );
    listenForHotstampChanges();

    select.onchange = (e) => {
        setHotstampSelectValue(e.target.value);
        shareHotstampUser(e.target.value);
    };
}
