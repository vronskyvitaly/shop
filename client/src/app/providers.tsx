'use client';

import type { ReactNode } from 'react';
import { Provider } from 'react-redux';
import { makeStore } from '@/lib/store/store';

// Store создаётся один раз при загрузке модуля, а не в рендере: configureStore вызывает Math.random(),
// а с cacheComponents это запрещено во время пререндера. Утечки данных между запросами на сервере нет:
// RTK Query отправляет запросы только в useEffect (в браузере), поэтому серверный store всегда пустой
const store = makeStore();

// Состояние, с которым сервер рендерил HTML, — пустое. Шапка и страница лежат в разных <Suspense>
// и гидратируются по очереди: шапка успевает загрузить категории в общий store, и страница при гидратации
// увидела бы данные, которых нет в серверном HTML → hydration mismatch. С serverState все useSelector
// во время гидратации читают пустое состояние (как на сервере), а сразу после — настоящее
const serverState = store.getState();

export function Providers({ children }: { children: ReactNode }) {
  return (
    <Provider store={store} serverState={serverState}>
      {children}
    </Provider>
  );
}
