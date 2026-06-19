module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('Employees', 'middleName', { type: Sequelize.STRING(100), allowNull: true });
    await queryInterface.addColumn('Employees', 'positionId', {
      type: Sequelize.UUID,
      allowNull: true,
      references: { model: 'Positions', key: 'id' },
      onDelete: 'NO ACTION',
    });
    await queryInterface.removeColumn('Employees', 'position');
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('Employees', 'position', { type: Sequelize.STRING(100), allowNull: true });
    await queryInterface.removeColumn('Employees', 'positionId');
    await queryInterface.removeColumn('Employees', 'middleName');
  },
};
