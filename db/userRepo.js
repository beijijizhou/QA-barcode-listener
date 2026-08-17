import { supabase } from "./supabase.js";

export async function findUser(
    name,
    password
) {
    const authenticated = await supabase.rpc(
        "authenticate_qa_employee",
        { p_login: name, p_password: password }
    );
    if (!authenticated.error) return authenticated.data?.[0] || null;

    const missingRpc =
        authenticated.error.code === "PGRST202" ||
        String(authenticated.error.message || "").includes(
            "authenticate_qa_employee"
        );
    if (!missingRpc) throw authenticated.error;

    // Transitional fallback until the shared database migrations are deployed.
    const { data, error } =
        await supabase
            .from('users')
            .select('*')
            .or(`name.eq.${name},user_name.eq.${name}`)
            .eq('password', password)
            .maybeSingle();

    if (error) {
        console.error(error);
        throw error;
    }

    if (!data?.employee_id) return data;

    const profile = await supabase.rpc(
        "get_employee_department_profile",
        { p_employee_id: data.employee_id }
    );
    if (profile.error) {
        const missingRpc =
            profile.error.code === "PGRST202" ||
            String(profile.error.message || "").includes(
                "get_employee_department_profile"
            );
        if (!missingRpc) console.error(profile.error);
        return {
            ...data,
            job_title: data.department || "员工",
            departments: ["DTF"]
        };
    }
    const employeeProfile = profile.data?.[0] || {};
    return {
        ...data,
        job_title:
            employeeProfile.job_title ||
            data.department ||
            "员工",
        departments:
            employeeProfile.departments || ["DTF"]
    };
}

