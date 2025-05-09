export class PlanError {
	level: "warn" | "error" | "note" = "warn";
	message: string = "";

	constructor(level: "warn" | "error" | "note", message: string) {
		this.level = level;
		this.message = message;
	}

	static warn(message: string): PlanError {
		return new PlanError("warn", message);
	}

	static error(message: string): PlanError {
		return new PlanError("error", message);
	}

	static note(message: string): PlanError {
		return new PlanError("note", message);
	}
}

const planErrors = {
	cant_parse_xml_input: () => PlanError.error("Найдена синтаксическая ошибка в XML"),
	no_flats: () => PlanError.note("В планировке не указано ни одной квартиры"),
	cant_parse_template: (templateName: string) => PlanError.error(`Не получилось добавить шаблон ${templateName}`),
	room_not_enough_walls: (flatId: string, roomNumber: number, count: number) => PlanError.note(`В комнате ${roomNumber + 1} квартиры ${flatId} недостаточно стен для построения комнаты (${count})`),
	axis_offset_not_number: (axisId: string) => PlanError.error(`offset координационной оси ${axisId} задан некорректно`),
	flat_no_rooms: (flatId: string) => PlanError.note(`В квартире ${flatId} не указано ни одной комнаты`),
	room_walls_incorrect: (flatId: string, roomNumber: number) => PlanError.warn(`В комнате ${roomNumber + 1} квартиры ${flatId} некорректно указаны стены`),
	template_not_found: (name: string, flatId: string) => PlanError.warn(`Не найден шаблон ${name} в квартире ${flatId}`)

};

export default planErrors;
