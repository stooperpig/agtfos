export const deleteData = async <T>(url = ""): Promise<T> => {
    const response = await fetch(url, {
        method: "DELETE",
        mode: "same-origin",
        cache: "no-cache",
        credentials: "same-origin",
        headers: {
            "Content-Type": "application/json",
        },
        redirect: "follow",
        referrerPolicy: "no-referrer"
    });

    if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
    }

    return response.json();
}

export const getData = async <T>(url: string): Promise<T> => {
    const response = await fetch(url, {
        method: "GET",
        mode: "same-origin",
        cache: "no-cache",
        credentials: "same-origin",
        headers: {
            "Content-Type": "application/json",
        },
        redirect: "follow",
        referrerPolicy: "no-referrer"
    });

    if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
    }

    return response.json();
}

export const postData = async <T>(url = "", data = {}): Promise<T> => {
    const response = await fetch(url, {
        method: "POST",
        mode: "same-origin",
        cache: "no-cache",
        credentials: "same-origin",
        headers: {
            "Content-Type": "application/json",
        },
        redirect: "follow",
        referrerPolicy: "no-referrer",
        body: JSON.stringify(data),
    });

    if (!response.ok) {
        const errorData = await response.json();
        if (errorData) {
            throw new Error(errorData.message);
        } else {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
    }

    return response.json();
}

export const putData = async <T>(url = "", data = {}): Promise<T> => {
    const response = await fetch(url, {
        method: "PUT",
        mode: "same-origin",
        cache: "no-cache",
        credentials: "same-origin",
        headers: {
            "Content-Type": "application/json",
        },
        redirect: "follow",
        referrerPolicy: "no-referrer",
        body: JSON.stringify(data)
    });

    if (!response.ok) {
        const errorData = await response.json();
        if (errorData) {
            throw new Error(errorData.message);
        } else {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
    }

    return response.json();
}

export const patchData = async <T>(url = "", data = {}): Promise<T> => {
    const response = await fetch(url, {
        method: "PATCH",
        mode: "same-origin",
        cache: "no-cache",
        credentials: "same-origin",
        headers: {
            "Content-Type": "application/json",
        },
        redirect: "follow",
        referrerPolicy: "no-referrer",
        body: JSON.stringify(data)
    });

    if (!response.ok) {
        const errorData = await response.json();
        if (errorData) {
            throw new Error(errorData.message);
        } else {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
    }

    return response.json();
}

export const resourceExists = async(url: string): Promise<boolean> => {
    try {
        const response = await fetch(url, { method: "HEAD" });

        return response.ok;
    } catch (error) {
        console.error("Network error:", error);
        return false;
    }
}