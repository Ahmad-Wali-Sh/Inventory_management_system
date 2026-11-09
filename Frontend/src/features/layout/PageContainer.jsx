// Standard page wrapper: a title row (with optional buttons) and the content.
// Every page inside the layout should use it, so all pages look the same.
//
//   <PageContainer title="Sales" actions={<button className="btn btn-primary">New sale</button>}>
//     ...page content...
//   </PageContainer>
export default function PageContainer({ title, actions, children }) {
  return (
    <div className="mx-auto w-full max-w-7xl">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">{title}</h1>
        {actions && <div className="flex gap-2">{actions}</div>}
      </div>
      {children}
    </div>
  );
}