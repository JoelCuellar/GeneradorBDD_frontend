"use client";

interface NavBarProps {
  activeView: "dashboard" | "users" | "projects" | "model";
  onNavigate: (view: "dashboard" | "users" | "projects" | "model") => void;
  onLogout: () => void;
  userName: string;
  projectCount: number;
  canManageUsers: boolean;
  canOpenModeler: boolean;
}

export default function NavBar({ activeView, onNavigate, onLogout, userName, projectCount, canManageUsers, canOpenModeler }: NavBarProps) {
  return (
    <nav className="bg-gray-900 text-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          <span className="text-lg font-semibold">Generador BDD</span>
          <span className="hidden text-sm text-gray-300 sm:inline">Proyectos activos: {projectCount}</span>
        </div>
        <div className="flex items-center gap-3">
          <NavButton
            label="Inicio"
            active={activeView === "dashboard"}
            onClick={() => onNavigate("dashboard")}
          />
          <NavButton
            label="Proyectos"
            active={activeView === "projects"}
            onClick={() => onNavigate("projects")}
          />
          <NavButton
            label="Modelador"
            active={activeView === "model"}
            onClick={() => onNavigate("model")}
            disabled={!canOpenModeler}
          />
          <NavButton
            label="Gestion de usuarios"
            active={activeView === "users"}
            onClick={() => onNavigate("users")}
            disabled={!canManageUsers}
          />
          <div className="hidden flex-col text-right text-xs sm:flex">
            <span className="font-semibold text-white">{userName}</span>
            <span className="text-gray-300">Sesion iniciada</span>
          </div>
          <button
            onClick={onLogout}
            className="rounded border border-gray-700 px-3 py-1 text-xs font-medium text-white hover:bg-gray-800"
          >
            Cerrar sesion
          </button>
        </div>
      </div>
    </nav>
  );
}

interface NavButtonProps {
  label: string;
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
}

function NavButton({ label, active, disabled, onClick }: NavButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`rounded px-3 py-1 text-xs font-medium transition ${
        active
          ? "bg-white text-gray-900"
          : disabled
            ? "bg-gray-800 text-gray-500"
            : "bg-gray-800 text-gray-200 hover:bg-gray-700"
      }`}
    >
      {label}
    </button>
  );
}
