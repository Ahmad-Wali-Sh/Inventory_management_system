// useCrud: loads a list from the API and gives you create / update / remove.
// It keeps the list in React state so the table updates without reloading.
//
//   const { rows, loading, error, reload, create, update, remove } = useCrud('/products');
import { useCallback, useEffect, useMemo, useState } from 'react';
import { createCrudApi } from '../api/createCrudApi';

export function useCrud(endpoint, idField = 'id') {
  // Build the API functions once per endpoint.
  const api = useMemo(() => createCrudApi(endpoint), [endpoint]);

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setRows(await api.list());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [api]);

  // Load once when the component appears (and again if the endpoint changes).
  useEffect(() => {
    reload();
  }, [reload]);

  // The backend returns the saved row, so we put it straight into the list.
  const create = async (data) => {
    const created = await api.create(data);
    setRows((old) => [...old, created]);
    return created;
  };

  const update = async (id, data) => {
    const updated = await api.update(id, data);
    setRows((old) => old.map((row) => (row[idField] === id ? updated : row)));
    return updated;
  };

  const remove = async (id) => {
    await api.remove(id);
    setRows((old) => old.filter((row) => row[idField] !== id));
  };

  return { rows, loading, error, reload, create, update, remove };
}