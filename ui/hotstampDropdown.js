import {
    getUsersByProductionDepartment
} from "../db/barcodeRepo";
import {
    getUserProductionDepartment
} from "../core/department.js";
import {
    getSharedCurrentUser,
    getSharedHotstampUser,
    isHotstampUserKey,
    onSharedStateChange,
    setSharedHotstampUser
} from "../storage/sharedState";

let isListeningForSharedHotstamp = false;

function escapeHtml(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function wait(ms) {
    return new Promise(resolve =>
        setTimeout(resolve, ms)
    );
}

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

function renderWorkerOptions(workers) {
    const options = workers
        .map(worker => `
            <option
                value="${escapeHtml(worker.name)}"
            >
                ${escapeHtml(worker.name)}
            </option>
        `)
        .join("");

    return `
        <option value="">
            请选择
        </option>
        ${options}
    `;
}

function renderLoading(wrapper) {
    wrapper.innerHTML = `
        <label for="qa-hotstamp-user">
            烫印人员
        </label>
        <select id="qa-hotstamp-user" disabled>
            <option>加载中...</option>
        </select>
    `;
}

function renderReload(wrapper, message) {
    wrapper.innerHTML = `
        <label for="qa-hotstamp-user">
            烫印人员
        </label>
        <select id="qa-hotstamp-user" disabled>
            <option>${escapeHtml(message)}</option>
        </select>
        <button id="qa-hotstamp-reload-btn">
            重新加载
        </button>
    `;
}

async function loadHotstampWorkers(forceRefresh = false) {
    let workers = [];
    const user = await getSharedCurrentUser();
    const department =
        getUserProductionDepartment(user || {});

    for (let attempt = 0; attempt < 3; attempt += 1) {
        const employees =
            await getUsersByProductionDepartment(
                department,
                {
                    forceRefresh:
                        forceRefresh || attempt > 0
                }
            );
        workers = employees.filter(employee =>
            String(employee.job_title || "")
                .trim() === "烫印"
        );

        if (workers.length) return workers;
        await wait(300 * (attempt + 1));
    }

    return workers;
}

async function hydrateHotstampDropdown(
    wrapper,
    forceRefresh = false
) {
    renderLoading(wrapper);

    try {
        const workers =
            await loadHotstampWorkers(forceRefresh);

        if (!workers.length) {
            renderReload(wrapper, "暂无在职烫印");
            wrapper
                .querySelector("#qa-hotstamp-reload-btn")
                .onclick = () =>
                    hydrateHotstampDropdown(
                        wrapper,
                        true
                    );
            return;
        }

        wrapper.innerHTML = `
            <label for="qa-hotstamp-user">
                烫印人员
            </label>

            <select id="qa-hotstamp-user">
                ${renderWorkerOptions(workers)}
            </select>
        `;

        const select =
            wrapper.querySelector("#qa-hotstamp-user");
        const sharedHotstamp =
            await getSharedHotstampUser();
        const hasSharedWorker = workers.some(
            worker => worker.name === sharedHotstamp
        );

        if (hasSharedWorker) {
            setHotstampSelectValue(sharedHotstamp);
        } else {
            setHotstampSelectValue("");
            await setSharedHotstampUser("");
        }

        listenForHotstampChanges();

        select.onchange = async (e) => {
            setHotstampSelectValue(e.target.value);
            await setSharedHotstampUser(e.target.value);
        };
    } catch (error) {
        console.error(
            "failed to load hotstamp users",
            error
        );
        renderReload(wrapper, "加载失败");
        wrapper
            .querySelector("#qa-hotstamp-reload-btn")
            .onclick = () =>
                hydrateHotstampDropdown(wrapper, true);
    }
}

export async function renderHotstampDropdown(badge) {
    const wrapper = document.createElement("div");
    wrapper.id = "qa-hotstamp-wrapper";

    badge.appendChild(wrapper);
    hydrateHotstampDropdown(wrapper);
}
