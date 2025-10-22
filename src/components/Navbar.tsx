import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { Bell, Settings, LogOut, Home, Building2, Users, Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export const Navbar: React.FC = () => {
	const navigate = useNavigate();
	const [isDark, setIsDark] = React.useState(false);

	React.useEffect(() => {
		const theme = localStorage.getItem('theme');
		const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
		const shouldBeDark = theme === 'dark' || (!theme && prefersDark);
		setIsDark(shouldBeDark);
		document.documentElement.classList.toggle('dark', shouldBeDark);
	}, []);

	const toggleTheme = () => {
		const newTheme = !isDark;
		setIsDark(newTheme);
		localStorage.setItem('theme', newTheme ? 'dark' : 'light');
		document.documentElement.classList.toggle('dark', newTheme);
	};

	const handleLogout = () => {
		localStorage.removeItem('adminToken');
		localStorage.removeItem('userToken');
		navigate('/admin-login');
	};

	return (
		<header className="w-full glass sticky top-0 z-50 animate-slide-up" dir="rtl">
			<div className="container mx-auto px-6 py-4">
				<div className="flex items-center justify-between">
					{/* Logo and Brand */}
					<div className="flex items-center gap-4">
						<div className="w-12 h-12 glass-card rounded-2xl flex items-center justify-center backdrop-blur-sm animate-scale-in">
							<span className="text-2xl font-bold gradient-text">ح</span>
						</div>
						<div>
							<h1 className="text-xl font-bold tracking-tight gradient-text">حياة غزة</h1>
							<p className="text-xs opacity-80">منصة إدارة المساعدات</p>
						</div>
					</div>

					{/* Navigation Links */}
					<nav className="hidden md:flex items-center gap-2">
						<Link
							to="/admin"
							className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium hover:bg-white/10 transition-all duration-300 hover:scale-105 focus-modern"
						>
							<Home className="h-4 w-4" />
							الرئيسية
						</Link>
						<Link
							to="/admin/institutions"
							className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium hover:bg-white/10 transition-all duration-300 hover:scale-105 focus-modern"
						>
							<Building2 className="h-4 w-4" />
							إدارة المؤسسات
						</Link>
						<Link
							to="/admin/families"
							className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium hover:bg-white/10 transition-all duration-300 hover:scale-105 focus-modern"
						>
							<Users className="h-4 w-4" />
							إدارة العائلات
						</Link>
					</nav>

					{/* Actions */}
					<div className="flex items-center gap-3">
						<Button
							variant="ghost"
							size="icon"
							className="hover:bg-white/10 hover:scale-110 transition-all duration-300 focus-modern"
							aria-label="الإشعارات"
						>
							<Bell className="h-5 w-5" />
						</Button>

						{/* Dark Mode Toggle */}
						<Button
							variant="ghost"
							size="icon"
							onClick={toggleTheme}
							className="hover:bg-white/10 hover:scale-110 transition-all duration-300 focus-modern"
							aria-label="تبديل الوضع المظلم"
						>
							{isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
						</Button>

						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<Button
									variant="ghost"
									className="relative h-10 w-10 rounded-full hover:bg-white/10 hover:scale-110 transition-all duration-300 focus-modern"
								>
									<Avatar className="h-8 w-8">
										<AvatarImage src="" alt="Admin" />
										<AvatarFallback className="bg-primary/20 text-primary font-semibold">
											أ
										</AvatarFallback>
									</Avatar>
								</Button>
							</DropdownMenuTrigger>
							<DropdownMenuContent className="w-56 mr-4 glass-card border-white/20" align="end">
								<DropdownMenuLabel className="text-right">
									<div className="flex flex-col space-y-1">
										<p className="text-sm font-medium">المشرف</p>
										<p className="text-xs text-muted-foreground">admin@gaza-life.com</p>
									</div>
								</DropdownMenuLabel>
								<DropdownMenuSeparator />
								<DropdownMenuItem className="text-right cursor-pointer focus-modern" onClick={() => navigate('/admin/settings')}>
									<Settings className="ml-2 h-4 w-4" />
									<span>الإعدادات</span>
								</DropdownMenuItem>
								<DropdownMenuSeparator />
								<DropdownMenuItem
									className="text-right cursor-pointer text-red-600 focus:text-red-600 focus-modern"
									onClick={handleLogout}
								>
									<LogOut className="ml-2 h-4 w-4" />
									<span>تسجيل الخروج</span>
								</DropdownMenuItem>
							</DropdownMenuContent>
						</DropdownMenu>
					</div>
				</div>
			</div>
		</header>
	);
};

export default Navbar;
