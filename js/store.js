(function () {
  const cfg = window.BLACKBEAR_CONFIG || {};

  const ready =
    !!cfg.SUPABASE_URL &&
    !cfg.SUPABASE_URL.includes("PASTE_") &&
    !!cfg.SUPABASE_ANON_KEY &&
    !cfg.SUPABASE_ANON_KEY.includes("PASTE_");

  let client = null;

  if (ready && window.supabase) {
    client = window.supabase.createClient(
      cfg.SUPABASE_URL,
      cfg.SUPABASE_ANON_KEY
    );
  }

  async function getSession() {
    if (!client) return null;

    const { data, error } = await client.auth.getSession();

    if (error) throw error;

    return data.session;
  }

  async function checkAdmin() {
    if (!client) return null;

    const session = await getSession();

    if (!session) return null;

    const { data, error } = await client
      .from("admin_users")
      .select("user_id")
      .eq("user_id", session.user.id)
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      await client.auth.signOut();
      return null;
    }

    return session;
  }

  async function requireAdmin() {
    if (!client) {
      throw new Error("Supabase is not configured.");
    }

    const session = await checkAdmin();

    if (!session) {
      throw new Error("Please login as admin.");
    }

    return session;
  }

  async function signIn(email, password) {
    if (!client) {
      throw new Error("Supabase is not configured.");
    }

    const { data, error } = await client.auth.signInWithPassword({
      email: email,
      password: password
    });

    if (error) throw error;

    try {
      await requireAdmin();
    } catch (err) {
      await client.auth.signOut();
      throw err;
    }

    return data;
  }

  async function signOut() {
    if (!client) return;

    const { error } = await client.auth.signOut();

    if (error) throw error;
  }

  async function getProducts() {
    if (!ready || !client) {
      return JSON.parse(
        localStorage.getItem("blackbear_products") || "[]"
      );
    }

    const { data, error } = await client
      .from("products")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;

    return data || [];
  }

  async function addProduct(product) {
    if (!client) {
      const list = JSON.parse(
        localStorage.getItem("blackbear_products") || "[]"
      );

      const item = Object.assign(
        {
          id: crypto.randomUUID(),
          created_at: new Date().toISOString()
        },
        product
      );

      list.unshift(item);

      localStorage.setItem(
        "blackbear_products",
        JSON.stringify(list)
      );

      return item;
    }

    await requireAdmin();

    const { data, error } = await client
      .from("products")
      .insert(product)
      .select()
      .single();

    if (error) throw error;

    return data;
  }

  async function updateProduct(id, product) {
    if (!client) {
      const list = JSON.parse(
        localStorage.getItem("blackbear_products") || "[]"
      ).map(function (p) {
        return p.id === id
          ? Object.assign({}, p, product)
          : p;
      });

      localStorage.setItem(
        "blackbear_products",
        JSON.stringify(list)
      );

      return;
    }

    await requireAdmin();

    const { error } = await client
      .from("products")
      .update(product)
      .eq("id", id);

    if (error) throw error;
  }

  async function deleteProduct(id) {
    if (!client) {
      const list = JSON.parse(
        localStorage.getItem("blackbear_products") || "[]"
      ).filter(function (p) {
        return p.id !== id;
      });

      localStorage.setItem(
        "blackbear_products",
        JSON.stringify(list)
      );

      return;
    }

    await requireAdmin();

    const { error } = await client
      .from("products")
      .delete()
      .eq("id", id);

    if (error) throw error;
  }

  async function createOrder(order) {
    if (!client) {
      const list = JSON.parse(
        localStorage.getItem("blackbear_orders") || "[]"
      );

      const item = Object.assign(
        {
          id: crypto.randomUUID(),
          created_at: new Date().toISOString(),
          status: "pending"
        },
        order
      );

      list.unshift(item);

      localStorage.setItem(
        "blackbear_orders",
        JSON.stringify(list)
      );

      return item;
    }

    const { data, error } = await client
      .from("orders")
      .insert(order)
      .select()
      .single();

    if (error) throw error;

    return data;
  }

  async function getOrders() {
    if (!client) {
      return JSON.parse(
        localStorage.getItem("blackbear_orders") || "[]"
      );
    }

    await requireAdmin();

    const { data, error } = await client
      .from("orders")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;

    return data || [];
  }

  async function updateOrder(id, changes) {
    if (!client) return;

    await requireAdmin();

    const { error } = await client
      .from("orders")
      .update(changes)
      .eq("id", id);

    if (error) throw error;
  }

  window.BlackBearStore = {
    ready: ready,
    getSession: getSession,
    checkAdmin: checkAdmin,
    signIn: signIn,
    signOut: signOut,
    getProducts: getProducts,
    addProduct: addProduct,
    updateProduct: updateProduct,
    deleteProduct: deleteProduct,
    createOrder: createOrder,
    getOrders: getOrders,
    updateOrder: updateOrder
  };
})();
