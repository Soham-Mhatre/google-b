const checklistItems = [];

export const getChecklistItems = () => {
  return checklistItems;
};

export const addToChecklist = (item) => {
  checklistItems.push(item);
};